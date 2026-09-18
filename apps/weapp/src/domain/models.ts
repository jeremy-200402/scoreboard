export type RoomStatus = 'active' | 'ended'
export type OperationStatus = 'active' | 'voided'

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

export interface PlayerLoss {
  playerId: string
  amount: number
}

export interface WinnerOperation {
  id: string
  roomId: string
  operatorId: string
  kind: 'winner'
  winnerId: string
  winAmount: number
  losses: PlayerLoss[]
  note: string
  status: OperationStatus
  createdAt: string
  updatedAt: string
}

export interface PlayerScore extends Player {
  score: number
}
