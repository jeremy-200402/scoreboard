export type RoomStatus = 'active' | 'ended'
export type TransferStatus = 'active' | 'voided'

export interface Player {
  id: string
  roomId: string
  name: string
  initialScore: 0
}

export interface Room {
  id: string
  name: string
  status: RoomStatus
  createdAt: string
  endedAt?: string
  players: Player[]
}

export interface Transfer {
  recipientId: string
  amount: number
}

interface OperationBase {
  id: string
  roomId: string
  operatorId: string
  note: string
  status: TransferStatus
  createdAt: string
  updatedAt: string
}

export interface PlayerLoss {
  playerId: string
  amount: number
}

export interface WinnerOperation extends OperationBase {
  kind: 'winner'
  winnerId: string
  winAmount: number
  losses: PlayerLoss[]
}

/** 兼容 V0.1 早期“一人给多人”的本地流水。 */
export interface LegacyTransferBatch extends OperationBase {
  kind?: 'transfer'
  giverId: string
  transfers: Transfer[]
}

export type ScoreOperation = WinnerOperation | LegacyTransferBatch

export interface PlayerScore extends Player {
  score: number
}
