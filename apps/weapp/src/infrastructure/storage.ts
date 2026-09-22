import Taro from '@tarojs/taro'
import type { Room, WinnerOperation } from '../domain/models'

const ROOM_KEY = 'scoreboard.rooms.v1'
const OPERATION_KEY = 'scoreboard.operations.v1'
const MY_PLAYER_NAME_KEY = 'scoreboard.my-player-name.v1'

async function readList<T>(key: string): Promise<T[]> {
  try {
    const result = await Taro.getStorage<T[]>({ key })
    return Array.isArray(result.data) ? result.data : []
  } catch {
    return []
  }
}

const newestFirst = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt))

export const scoreboardRepository = {
  async listRooms() {
    return newestFirst(await readList<Room>(ROOM_KEY))
  },

  async listOperations() {
    return newestFirst(await readList<WinnerOperation>(OPERATION_KEY))
  },

  async saveRoom(room: Room) {
    const rooms = await this.listRooms()
    const next = [room, ...rooms.filter((item) => item.id !== room.id)]
    await Taro.setStorage({ key: ROOM_KEY, data: next })
  },

  async saveOperation(operation: WinnerOperation) {
    const operations = await this.listOperations()
    const next = [operation, ...operations.filter((item) => item.id !== operation.id)]
    await Taro.setStorage({ key: OPERATION_KEY, data: next })
  },

  async getMyPlayerName() {
    try {
      const result = await Taro.getStorage<string>({ key: MY_PLAYER_NAME_KEY })
      return typeof result.data === 'string' ? result.data : ''
    } catch {
      return ''
    }
  },

  async saveMyPlayerName(playerName: string) {
    await Taro.setStorage({ key: MY_PLAYER_NAME_KEY, data: playerName.trim() })
  },
}
