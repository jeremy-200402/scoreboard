import { describe, expect, it } from 'vitest'
import type { Room, WinnerOperation } from './models'
import { calculatePlayerStatistics, listPlayerNames } from './statistics'

const rooms: Room[] = [
  {
    id: 'room-2',
    name: '周六牌局',
    status: 'ended',
    createdAt: '2026-09-20T00:00:00.000Z',
    endedAt: '2026-09-20T02:00:00.000Z',
    players: ['小张', '小李', '校长'].map((name, index) => ({ id: `r2-p${index}`, roomId: 'room-2', name, initialScore: 0 })),
  },
  {
    id: 'room-1',
    name: '周五牌局',
    status: 'active',
    createdAt: '2026-09-19T00:00:00.000Z',
    players: ['小张', '小王', '小李'].map((name, index) => ({ id: `r1-p${index}`, roomId: 'room-1', name, initialScore: 0 })),
  },
]

const operations: WinnerOperation[] = [
  {
    id: 'op-2', roomId: 'room-2', operatorId: 'r2-p1', kind: 'winner', winnerId: 'r2-p1', winAmount: 8,
    losses: [{ playerId: 'r2-p0', amount: 3 }, { playerId: 'r2-p2', amount: 5 }], note: '', status: 'active',
    createdAt: '2026-09-20T01:00:00.000Z', updatedAt: '2026-09-20T01:00:00.000Z',
  },
  {
    id: 'op-1', roomId: 'room-1', operatorId: 'r1-p0', kind: 'winner', winnerId: 'r1-p0', winAmount: 10,
    losses: [{ playerId: 'r1-p1', amount: 4 }, { playerId: 'r1-p2', amount: 6 }], note: '', status: 'active',
    createdAt: '2026-09-19T01:00:00.000Z', updatedAt: '2026-09-19T01:00:00.000Z',
  },
  {
    id: 'op-voided', roomId: 'room-1', operatorId: 'r1-p1', kind: 'winner', winnerId: 'r1-p1', winAmount: 20,
    losses: [{ playerId: 'r1-p0', amount: 10 }, { playerId: 'r1-p2', amount: 10 }], note: '', status: 'voided',
    createdAt: '2026-09-19T02:00:00.000Z', updatedAt: '2026-09-19T02:00:00.000Z',
  },
]

describe('player statistics', () => {
  it('lists each historical player name once in first-seen order', () => {
    expect(listPlayerNames(rooms)).toEqual(['小张', '小李', '校长', '小王'])
  })

  it('summarizes the selected player across rooms and ignores voided records', () => {
    const result = calculatePlayerStatistics(rooms, operations, '小张')

    expect(result.totalScore).toBe(7)
    expect(result.roomCount).toBe(2)
    expect(result.roundCount).toBe(2)
    expect(result.winningRoomCount).toBe(1)
    expect(result.bestRoomScore).toBe(10)
    expect(result.history.map((item) => [item.room.id, item.myScore, item.myRank])).toEqual([
      ['room-2', -3, 2],
      ['room-1', 10, 1],
    ])
  })

  it('returns an empty summary when the selected name has no history', () => {
    expect(calculatePlayerStatistics(rooms, operations, '陌生人')).toMatchObject({
      totalScore: 0,
      roomCount: 0,
      roundCount: 0,
      history: [],
    })
  })

  it('keeps the least-negative result as the best room when every room is a loss', () => {
    const result = calculatePlayerStatistics(rooms, operations, '校长')

    expect(result.totalScore).toBe(-5)
    expect(result.bestRoomScore).toBe(-5)
  })
})
