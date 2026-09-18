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

  it('records a batch transfer with one confirmation', async () => {
    const room = await useScoreboardStore.getState().createRoom('测试牌局', ['小张', '小王', '小李', '校长'])
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={[`/room/${room.id}`]}><App /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: /记一笔给分/ }))
    await user.type(screen.getByLabelText('给小王的分数'), '2')
    await user.type(screen.getByLabelText('给小李的分数'), '6')
    await user.type(screen.getByLabelText('给校长的分数'), '2')
    await user.click(screen.getByRole('button', { name: /确认给分/ }))

    expect(await screen.findByText('小王 +2 · 小李 +6 · 校长 +2')).toBeInTheDocument()
    expect(screen.getByText('-10')).toBeInTheDocument()
    expect(screen.getByText('账目已平')).toBeInTheDocument()
  })
})

