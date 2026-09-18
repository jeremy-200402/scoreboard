import { z } from 'zod'
import type { PlayerScore, Room, TransferBatch } from './models'

export const transferDraftSchema = z
  .object({
    giverId: z.string().min(1, '请选择给分人'),
    transfers: z
      .array(
        z.object({
          recipientId: z.string().min(1),
          amount: z.number().int('分数必须是整数').positive('分数必须大于 0'),
        }),
      )
      .min(1, '请至少填写一位接收人的分数'),
  })
  .superRefine((value, context) => {
    const recipients = value.transfers.map((transfer) => transfer.recipientId)
    if (recipients.includes(value.giverId)) {
      context.addIssue({ code: 'custom', message: '不能给自己分数' })
    }
    if (new Set(recipients).size !== recipients.length) {
      context.addIssue({ code: 'custom', message: '同一接收人不能重复' })
    }
  })

export function calculateScores(room: Room, batches: TransferBatch[]): PlayerScore[] {
  const scores = new Map(room.players.map((player) => [player.id, player.initialScore as number]))

  batches
    .filter((batch) => batch.roomId === room.id && batch.status === 'active')
    .forEach((batch) => {
      const total = batch.transfers.reduce((sum, transfer) => sum + transfer.amount, 0)
      scores.set(batch.giverId, (scores.get(batch.giverId) ?? 0) - total)
      batch.transfers.forEach((transfer) => {
        scores.set(transfer.recipientId, (scores.get(transfer.recipientId) ?? 0) + transfer.amount)
      })
    })

  return room.players.map((player) => ({ ...player, score: scores.get(player.id) ?? 0 }))
}

export function assertZeroSum(scores: PlayerScore[]): boolean {
  return scores.reduce((sum, player) => sum + player.score, 0) === 0
}

export function batchTotal(batch: Pick<TransferBatch, 'transfers'>): number {
  return batch.transfers.reduce((sum, transfer) => sum + transfer.amount, 0)
}

