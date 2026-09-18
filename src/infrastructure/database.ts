import Dexie, { type EntityTable } from 'dexie'
import type { Room, ScoreOperation } from '../domain/models'

export class ScoreboardDatabase extends Dexie {
  rooms!: EntityTable<Room, 'id'>
  transferBatches!: EntityTable<ScoreOperation, 'id'>

  constructor() {
    super('scoreboard-mvp')
    this.version(1).stores({
      rooms: 'id,status,createdAt',
      transferBatches: 'id,roomId,status,createdAt',
    })
  }
}

export const db = new ScoreboardDatabase()

export const scoreboardRepository = {
  async listRooms() {
    return db.rooms.orderBy('createdAt').reverse().toArray()
  },
  async listBatches() {
    return db.transferBatches.orderBy('createdAt').reverse().toArray()
  },
  async saveRoom(room: Room) {
    await db.rooms.put(room)
  },
  async saveBatch(batch: ScoreOperation) {
    await db.transferBatches.put(batch)
  },
  async clearAll() {
    await db.transaction('rw', db.rooms, db.transferBatches, async () => {
      await Promise.all([db.rooms.clear(), db.transferBatches.clear()])
    })
  },
}
