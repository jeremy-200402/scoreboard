import type { PlayerScore, Room, WinnerOperation } from './models'
import { calculateScores } from './score'

export interface RoomStatistics {
  room: Room
  scores: PlayerScore[]
  recordCount: number
  myScore: number
  myRank: number
}

export interface PlayerStatistics {
  playerName: string
  totalScore: number
  roomCount: number
  roundCount: number
  winningRoomCount: number
  bestRoomScore: number
  history: RoomStatistics[]
}

const activeOperationsFor = (roomId: string, operations: WinnerOperation[]) =>
  operations.filter((operation) => operation.roomId === roomId && operation.status === 'active')

export function listPlayerNames(rooms: Room[]): string[] {
  const names = new Set<string>()
  rooms.forEach((room) => room.players.forEach((player) => {
    const name = player.name.trim()
    if (name) names.add(name)
  }))
  return [...names]
}

export function calculatePlayerStatistics(
  rooms: Room[],
  operations: WinnerOperation[],
  playerName: string,
): PlayerStatistics {
  const normalizedName = playerName.trim()
  const history = rooms
    .filter((room) => room.players.some((player) => player.name.trim() === normalizedName))
    .map((room) => {
      const roomOperations = activeOperationsFor(room.id, operations)
      const scores = calculateScores(room, roomOperations)
      const myScore = scores.find((player) => player.name.trim() === normalizedName)?.score ?? 0
      const orderedScores = [...scores].sort((left, right) => right.score - left.score)
      const myRank = orderedScores.findIndex((player) => player.name.trim() === normalizedName) + 1

      return {
        room,
        scores: orderedScores,
        recordCount: roomOperations.length,
        myScore,
        myRank,
      }
    })

  const totalScore = history.reduce((sum, item) => sum + item.myScore, 0)

  return {
    playerName: normalizedName,
    totalScore,
    roomCount: history.length,
    roundCount: history.reduce((sum, item) => sum + item.recordCount, 0),
    winningRoomCount: history.filter((item) => item.myScore > 0).length,
    bestRoomScore: history.length > 0 ? Math.max(...history.map((item) => item.myScore)) : 0,
    history,
  }
}
