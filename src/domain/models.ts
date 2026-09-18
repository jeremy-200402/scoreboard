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

export interface TransferBatch {
  id: string
  roomId: string
  operatorId: string
  giverId: string
  transfers: Transfer[]
  note: string
  status: TransferStatus
  createdAt: string
  updatedAt: string
}

export interface PlayerScore extends Player {
  score: number
}

