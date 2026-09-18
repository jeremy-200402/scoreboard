import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { db } from './infrastructure/database'
import { useScoreboardStore } from './stores/scoreboard'

describe('Scoreboard app', () => {
  beforeEach(async () => {
    await db.rooms.clear()
    await db.transferBatches.clear()
    useScoreboardStore.setState({ rooms: [], batches: [], hydrated: true })
  })

  it('creates a four-player room with zero scores', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/create']}><App /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: /创建并开始/ }))

    expect(await screen.findByText('小张的牌局')).toBeInTheDocument()
    expect(screen.getByText('账目已平')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(5)
  })

  it('records one winner, accepts loser expenses and auto-fills the final player', async () => {
    const room = await useScoreboardStore.getState().createRoom('测试牌局', ['小张', '小王', '小李', '校长'])
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={[`/room/${room.id}`]}><App /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: /记录本局/ }))
    await user.click(screen.getByRole('radio', { name: '小李' }))
    await user.type(screen.getByLabelText('小李赢的分数'), '10')
    await user.type(screen.getByLabelText('小张支出的分数'), '2')
    await user.type(screen.getByLabelText('小王支出的分数'), '6')

    expect(screen.getByLabelText('校长支出的分数')).toHaveValue('2')
    expect(screen.getByText('本局已算平')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /确认本局/ }))

    expect(await screen.findByText('小张 −2 · 小王 −6 · 校长 −2')).toBeInTheDocument()
    expect(screen.getByText('+10')).toBeInTheDocument()
    expect(screen.getByText('账目已平')).toBeInTheDocument()
  })
})
