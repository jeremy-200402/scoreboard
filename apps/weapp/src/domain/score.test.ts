import { describe, expect, it } from 'vitest'
import type { Room, WinnerOperation } from './models'
import { assertZeroSum, calculateAutoLoss, calculateScores, validateWinnerOperation } from './score'

const room: Room = {
  id: 'room-1',
  name: '测试牌局',
  status: 'active',
  createdAt: '2026-09-19T00:00:00.000Z',
  players: ['小张', '小王', '小李', '校长'].map((name, index) => ({
    id: `p${index + 1}`,
    roomId: 'room-1',
    name,
    initialScore: 0 as const,
  })),
}

const operation: WinnerOperation = {
  id: 'op-1',
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
  createdAt: '2026-09-19T00:00:00.000Z',
  updatedAt: '2026-09-19T00:00:00.000Z',
}

describe('WeChat mini program score domain', () => {
  it('calculates a zero-sum winner operation', () => {
    const scores = calculateScores(room, [operation])
    expect(scores.map((player) => player.score)).toEqual([-2, -6, 10, -2])
    expect(assertZeroSum(scores)).toBe(true)
  })

  it('auto-fills the final loser and rejects an overdrawn result', () => {
    expect(calculateAutoLoss(10, [2, 6])).toBe(2)
    expect(calculateAutoLoss(10, [4, 7])).toBe(-1)
  })

  it('validates that all players and points balance', () => {
    expect(validateWinnerOperation({ room, winnerId: operation.winnerId, winAmount: 10, losses: operation.losses })).toBeNull()
    expect(validateWinnerOperation({ room, winnerId: operation.winnerId, winAmount: 9, losses: operation.losses })).toBe('赢家和输家的分数没有算平')
  })
})
