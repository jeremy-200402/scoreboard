import { describe, expect, it } from 'vitest'
import type { Room, TransferBatch } from './models'
import { assertZeroSum, calculateScores, transferDraftSchema } from './score'

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

const batch: TransferBatch = {
  id: 'batch-1',
  roomId: room.id,
  operatorId: 'p1',
  giverId: 'p1',
  transfers: [
    { recipientId: 'p2', amount: 2 },
    { recipientId: 'p3', amount: 6 },
    { recipientId: 'p4', amount: 2 },
  ],
  note: '',
  status: 'active',
  createdAt: '2026-09-18T00:00:00.000Z',
  updatedAt: '2026-09-18T00:00:00.000Z',
}

describe('score domain', () => {
  it('calculates one-to-many transfer as a zero-sum batch', () => {
    const scores = calculateScores(room, [batch])
    expect(scores.map((player) => player.score)).toEqual([-10, 2, 6, 2])
    expect(assertZeroSum(scores)).toBe(true)
  })

  it('ignores voided batches when rebuilding scores', () => {
    const scores = calculateScores(room, [{ ...batch, status: 'voided' }])
    expect(scores.map((player) => player.score)).toEqual([0, 0, 0, 0])
  })

  it('rejects self transfers, duplicate recipients and invalid amounts', () => {
    expect(() => transferDraftSchema.parse({ giverId: 'p1', transfers: [{ recipientId: 'p1', amount: 1 }] })).toThrow()
    expect(() => transferDraftSchema.parse({ giverId: 'p1', transfers: [{ recipientId: 'p2', amount: 0 }] })).toThrow()
    expect(() => transferDraftSchema.parse({ giverId: 'p1', transfers: [{ recipientId: 'p2', amount: 1 }, { recipientId: 'p2', amount: 2 }] })).toThrow()
  })
})

