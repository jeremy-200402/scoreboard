import type { PlayerLoss, PlayerScore, Room, WinnerOperation } from './models'

export function calculateScores(room: Room, operations: WinnerOperation[]): PlayerScore[] {
  const scores = new Map(room.players.map((player) => [player.id, player.initialScore as number]))

  operations
    .filter((operation) => operation.roomId === room.id && operation.status === 'active')
    .forEach((operation) => {
      scores.set(operation.winnerId, (scores.get(operation.winnerId) ?? 0) + operation.winAmount)
      operation.losses.forEach((loss) => {
        scores.set(loss.playerId, (scores.get(loss.playerId) ?? 0) - loss.amount)
      })
    })

  return room.players.map((player) => ({ ...player, score: scores.get(player.id) ?? 0 }))
}

export function assertZeroSum(scores: PlayerScore[]): boolean {
  return scores.reduce((sum, player) => sum + player.score, 0) === 0
}

export function calculateAutoLoss(winAmount: number, manualAmounts: number[]): number {
  if (!Number.isInteger(winAmount) || winAmount <= 0) return 0
  if (manualAmounts.some((amount) => !Number.isInteger(amount) || amount <= 0)) return 0
  return winAmount - manualAmounts.reduce((sum, amount) => sum + amount, 0)
}

export function validateWinnerOperation(input: {
  room: Room
  winnerId: string
  winAmount: number
  losses: PlayerLoss[]
}): string | null {
  const playerIds = new Set(input.room.players.map((player) => player.id))
  if (!playerIds.has(input.winnerId)) return '请选择赢家'
  if (!Number.isInteger(input.winAmount) || input.winAmount <= 0) return '赢分必须是大于 0 的整数'
  if (input.losses.length !== input.room.players.length - 1) return '每位输家都需要填写支出'
  if (input.losses.some((loss) => loss.playerId === input.winnerId || !playerIds.has(loss.playerId))) return '赢家不能同时是输家'
  if (new Set(input.losses.map((loss) => loss.playerId)).size !== input.losses.length) return '输家不能重复'
  if (input.losses.some((loss) => !Number.isInteger(loss.amount) || loss.amount <= 0)) return '每位输家的支出必须大于 0'
  if (input.losses.reduce((sum, loss) => sum + loss.amount, 0) !== input.winAmount) return '赢家和输家的分数没有算平'
  return null
}

export const scoreLabel = (score: number) => (score > 0 ? `+${score}` : `${score}`)
