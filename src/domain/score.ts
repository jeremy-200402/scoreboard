import { z } from 'zod'
import type { PlayerScore, Room, ScoreOperation, WinnerOperation } from './models'

export const winnerOperationDraftSchema = z
  .object({
    winnerId: z.string().min(1, '请选择赢家'),
    winAmount: z.number().int('赢分必须是整数').positive('赢分必须大于 0'),
    losses: z
      .array(
        z.object({
          playerId: z.string().min(1),
          amount: z.number().int('支出必须是整数').positive('每位输家的支出必须大于 0'),
        }),
      )
      .min(1, '请至少填写一位输家的支出'),
  })
  .superRefine((value, context) => {
    const losers = value.losses.map((loss) => loss.playerId)
    if (losers.includes(value.winnerId)) {
      context.addIssue({ code: 'custom', message: '赢家不能同时是输家' })
    }
    if (new Set(losers).size !== losers.length) {
      context.addIssue({ code: 'custom', message: '同一位输家不能重复' })
    }
    const totalLoss = value.losses.reduce((sum, loss) => sum + loss.amount, 0)
    if (totalLoss !== value.winAmount) {
      context.addIssue({ code: 'custom', message: `输家合计 ${totalLoss} 分，与赢家的 ${value.winAmount} 分不一致` })
    }
  })

export function isWinnerOperation(operation: ScoreOperation): operation is WinnerOperation {
  return operation.kind === 'winner'
}

export function calculateScores(room: Room, batches: ScoreOperation[]): PlayerScore[] {
  const scores = new Map(room.players.map((player) => [player.id, player.initialScore as number]))

  batches
    .filter((batch) => batch.roomId === room.id && batch.status === 'active')
    .forEach((batch) => {
      if (isWinnerOperation(batch)) {
        scores.set(batch.winnerId, (scores.get(batch.winnerId) ?? 0) + batch.winAmount)
        batch.losses.forEach((loss) => {
          scores.set(loss.playerId, (scores.get(loss.playerId) ?? 0) - loss.amount)
        })
      } else {
        const total = batch.transfers.reduce((sum, transfer) => sum + transfer.amount, 0)
        scores.set(batch.giverId, (scores.get(batch.giverId) ?? 0) - total)
        batch.transfers.forEach((transfer) => {
          scores.set(transfer.recipientId, (scores.get(transfer.recipientId) ?? 0) + transfer.amount)
        })
      }
    })

  return room.players.map((player) => ({ ...player, score: scores.get(player.id) ?? 0 }))
}

export function assertZeroSum(scores: PlayerScore[]): boolean {
  return scores.reduce((sum, player) => sum + player.score, 0) === 0
}

export function operationTotal(operation: ScoreOperation): number {
  return isWinnerOperation(operation)
    ? operation.winAmount
    : operation.transfers.reduce((sum, transfer) => sum + transfer.amount, 0)
}
