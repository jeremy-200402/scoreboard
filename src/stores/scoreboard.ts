import { create } from 'zustand'
import type { PlayerLoss, Room, ScoreOperation, WinnerOperation } from '../domain/models'
import { scoreboardRepository } from '../infrastructure/database'
import { winnerOperationDraftSchema } from '../domain/score'

const makeId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

interface ScoreboardState {
  rooms: Room[]
  batches: ScoreOperation[]
  hydrated: boolean
  load: () => Promise<void>
  createRoom: (name: string, playerNames: string[]) => Promise<Room>
  saveOperation: (input: {
    roomId: string
    winnerId: string
    winAmount: number
    losses: PlayerLoss[]
    note: string
    batchId?: string
  }) => Promise<void>
  voidTransfer: (batchId: string) => Promise<void>
  endRoom: (roomId: string) => Promise<void>
}

export const useScoreboardStore = create<ScoreboardState>((set, get) => ({
  rooms: [],
  batches: [],
  hydrated: false,

  load: async () => {
    const [rooms, batches] = await Promise.all([
      scoreboardRepository.listRooms(),
      scoreboardRepository.listBatches(),
    ])
    set({ rooms, batches, hydrated: true })
  },

  createRoom: async (name, rawNames) => {
    const playerNames = rawNames.map((item) => item.trim()).filter(Boolean)
    if (playerNames.length < 2 || playerNames.length > 8) {
      throw new Error('房间需要 2 至 8 名玩家')
    }
    if (new Set(playerNames).size !== playerNames.length) {
      throw new Error('玩家昵称不能重复')
    }
    const roomId = makeId()
    const room: Room = {
      id: roomId,
      name: name.trim() || `${playerNames[0]}的牌局`,
      status: 'active',
      createdAt: now(),
      players: playerNames.map((playerName) => ({
        id: makeId(),
        roomId,
        name: playerName,
        initialScore: 0,
      })),
    }
    await scoreboardRepository.saveRoom(room)
    set({ rooms: [room, ...get().rooms] })
    return room
  },

  saveOperation: async ({ roomId, winnerId, winAmount, losses, note, batchId }) => {
    const room = get().rooms.find((item) => item.id === roomId)
    if (!room || room.status !== 'active') throw new Error('当前房间不可记分')
    winnerOperationDraftSchema.parse({ winnerId, winAmount, losses })
    const existing = batchId ? get().batches.find((item) => item.id === batchId) : undefined
    const timestamp = now()
    const batch: WinnerOperation = {
      id: existing?.id ?? makeId(),
      roomId,
      operatorId: existing?.operatorId ?? winnerId,
      kind: 'winner',
      winnerId,
      winAmount,
      losses,
      note: note.trim(),
      status: 'active',
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    await scoreboardRepository.saveBatch(batch)
    set({ batches: [batch, ...get().batches.filter((item) => item.id !== batch.id)] })
  },

  voidTransfer: async (batchId) => {
    const batch = get().batches.find((item) => item.id === batchId)
    if (!batch || batch.status === 'voided') return
    const voided = { ...batch, status: 'voided' as const, updatedAt: now() }
    await scoreboardRepository.saveBatch(voided)
    set({ batches: get().batches.map((item) => (item.id === batchId ? voided : item)) })
  },

  endRoom: async (roomId) => {
    const room = get().rooms.find((item) => item.id === roomId)
    if (!room) return
    const ended = { ...room, status: 'ended' as const, endedAt: now() }
    await scoreboardRepository.saveRoom(ended)
    set({ rooms: get().rooms.map((item) => (item.id === roomId ? ended : item)) })
  },
}))
