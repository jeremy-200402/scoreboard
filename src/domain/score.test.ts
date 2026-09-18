import { describe, expect, it } from 'vitest'
import type { Room, WinnerOperation } from './models'
import { assertZeroSum, calculateScores, winnerOperationDraftSchema } from './score'

const room: Room = {
  id: 'room-1',
  name: '测试牌局',
  status: 'active',
  createdAt: '2026-09-18T00:00:00.000Z',
  players: ['小张', '小王', '小李', '校长'].map((name, index) => ({
    id: `p${index + 1}`,
    roomId: 'room-1',
    name,
    initialScore: 0 as const,
  })),
}

const batch: WinnerOperation = {
  id: 'batch-1',
  roomId: room.id,
  operatorId: 'p3',
  kind: 'winner',
  winnerId: 'p3',
  winAmount: 10,
  losses: [
    { playerId: 'p1', amount: 2 },
    { playerId: 'p2', amount: 6 },
    { playerId: 'p4', amount: 2 },
  ],
  note: '',
  status: 'active',
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
}

describe('score domain', () => {
  it('calculates one winner and multiple losers as a zero-sum operation', () => {
    const scores = calculateScores(room, [batch])
    expect(scores.map((player) => player.score)).toEqual([-2, -6, 10, -2])
    expect(assertZeroSum(scores)).toBe(true)
  })

  it('ignores voided batches when rebuilding scores', () => {
    const scores = calculateScores(room, [{ ...batch, status: 'voided' }])
    expect(scores.map((player) => player.score)).toEqual([0, 0, 0, 0])
  })

  it('rejects unbalanced, duplicate, self and invalid loss entries', () => {
    expect(() => winnerOperationDraftSchema.parse({ winnerId: 'p1', winAmount: 1, losses: [{ playerId: 'p1', amount: 1 }] })).toThrow()
    expect(() => winnerOperationDraftSchema.parse({ winnerId: 'p1', winAmount: 1, losses: [{ playerId: 'p2', amount: 0 }] })).toThrow()
    expect(() => winnerOperationDraftSchema.parse({ winnerId: 'p1', winAmount: 3, losses: [{ playerId: 'p2', amount: 1 }, { playerId: 'p2', amount: 2 }] })).toThrow()
    expect(() => winnerOperationDraftSchema.parse({ winnerId: 'p1', winAmount: 5, losses: [{ playerId: 'p2', amount: 2 }] })).toThrow()
  })
})
