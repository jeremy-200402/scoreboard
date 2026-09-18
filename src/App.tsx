import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { Player, Room, Transfer, TransferBatch } from './domain/models'
import { assertZeroSum, batchTotal, calculateScores } from './domain/score'
import { useScoreboardStore } from './stores/scoreboard'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )

const scoreLabel = (score: number) => (score > 0 ? `+${score}` : `${score}`)

function MarkIcon({ size = 28 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="3" y="3" width="26" height="26" rx="8" fill="currentColor" />
      <circle cx="11" cy="11" r="2.4" fill="#fff" />
      <circle cx="21" cy="11" r="2.4" fill="#fff" />
      <circle cx="11" cy="21" r="2.4" fill="#fff" />
      <circle cx="21" cy="21" r="2.4" fill="#fff" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function AppHeader({ backTo, quiet = false }: { backTo?: string; quiet?: boolean }) {
  return (
    <header className={`app-header ${quiet ? 'app-header--quiet' : ''}`}>
      {backTo ? (
        <Link className="icon-button" to={backTo} aria-label="返回">
          <span aria-hidden="true">←</span>
        </Link>
      ) : (
        <div className="brand-mark"><MarkIcon /></div>
      )}
      <Link className="wordmark" to="/">SCOREBOARD</Link>
      <div className="header-balance" />
    </header>
  )
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-mark brand-mark--large"><MarkIcon size={42} /></div>
      <p>正在摆好记分牌…</p>
    </main>
  )
}

function HomePage() {
  const rooms = useScoreboardStore((state) => state.rooms)
  const batches = useScoreboardStore((state) => state.batches)
  const createDemoRoom = useScoreboardStore((state) => state.createDemoRoom)
  const navigate = useNavigate()
  const [loadingDemo, setLoadingDemo] = useState(false)
  const activeRooms = rooms.filter((room) => room.status === 'active')
  const endedRooms = rooms.filter((room) => room.status === 'ended')

  const loadDemo = async () => {
    setLoadingDemo(true)
    try {
      const room = await createDemoRoom()
      navigate(`/room/${room.id}`)
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <div className="page page--home">
      <AppHeader />
      <main>
        <section className="home-hero">
          <div className="hero-copy">
            <p className="eyebrow">牌局记清楚，输赢不糊涂</p>
            <h1>把分记在桌上，<br />把心留在牌里。</h1>
            <p className="hero-note">麻将、扑克都能用。一人给，多人收，每一笔自动归零。</p>
          </div>
          <div className="zero-seal" aria-label="零和记分">
            <span className="zero-seal__number">0</span>
            <span className="zero-seal__label">总分恒定</span>
          </div>
        </section>

        <section className="home-actions" aria-label="开始记分">
          <Link to="/create" className="button button--primary button--large">
            创建新牌局 <ArrowIcon />
          </Link>
          <button className="button button--ghost" onClick={loadDemo} disabled={loadingDemo}>
            {loadingDemo ? '正在准备…' : '载入示例牌局'}
          </button>
        </section>

        {activeRooms.length > 0 && (
          <RoomList title="继续牌局" rooms={activeRooms} batches={batches} />
        )}
        {endedRooms.length > 0 && (
          <RoomList title="历史牌局" rooms={endedRooms} batches={batches} />
        )}

        {rooms.length === 0 && (
          <section className="empty-guide">
            <p className="section-kicker">三步完成</p>
            <ol>
              <li><span>1</span>添加 2–8 位玩家</li>
              <li><span>2</span>选择给分人和接收人</li>
              <li><span>3</span>一次确认，自动算平</li>
            </ol>
          </section>
        )}
      </main>
    </div>
  )
}

function RoomList({ title, rooms, batches }: { title: string; rooms: Room[]; batches: TransferBatch[] }) {
  return (
    <section className="room-list-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{rooms.length} 局</span>
      </div>
      <div className="room-list">
        {rooms.map((room) => {
          const roomBatches = batches.filter((batch) => batch.roomId === room.id && batch.status === 'active')
          const scores = calculateScores(room, roomBatches)
          const leader = [...scores].sort((a, b) => b.score - a.score)[0]
          return (
            <Link to={`/room/${room.id}`} className="room-row" key={room.id}>
              <div>
                <p className="room-row__title">{room.name}</p>
                <p className="room-row__meta">{room.players.length} 人 · {roomBatches.length} 笔 · {formatDate(room.createdAt)}</p>
              </div>
              <div className="room-row__score">
                <span>{leader?.name}</span>
                <strong>{scoreLabel(leader?.score ?? 0)}</strong>
              </div>
              <ArrowIcon />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function CreateRoomPage() {
  const createRoom = useScoreboardStore((state) => state.createRoom)
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')
  const [players, setPlayers] = useState(['小张', '小王', '小李', '校长'])
  const [error, setError] = useState('')

  const updatePlayer = (index: number, value: string) => {
    setPlayers((items) => items.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const room = await createRoom(roomName, players)
      navigate(`/room/${room.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '创建房间失败')
    }
  }

  return (
    <div className="page">
      <AppHeader backTo="/" quiet />
      <main className="form-page">
        <p className="eyebrow">新牌局</p>
        <h1>谁上桌？</h1>
        <p className="page-lead">所有人从 0 分开始，牌局中每一笔给分都会自动保持平衡。</p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>牌局名称 <small>可选</small></span>
            <input value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="例如：周五麻将局" />
          </label>

          <div className="field-group">
            <div className="field-group__heading">
              <span>玩家</span>
              <small>{players.length}/8</small>
            </div>
            <div className="player-fields">
              {players.map((player, index) => (
                <div className="player-field" key={index}>
                  <span className="seat-number">{String(index + 1).padStart(2, '0')}</span>
                  <input
                    aria-label={`玩家 ${index + 1}`}
                    value={player}
                    onChange={(event) => updatePlayer(index, event.target.value)}
                    placeholder={`玩家 ${index + 1}`}
                    autoComplete="off"
                  />
                  {players.length > 2 && (
                    <button type="button" className="remove-player" onClick={() => setPlayers((items) => items.filter((_, i) => i !== index))} aria-label={`删除${player || `玩家 ${index + 1}`}`}>×</button>
                  )}
                </div>
              ))}
            </div>
            {players.length < 8 && (
              <button type="button" className="add-player" onClick={() => setPlayers((items) => [...items, ''])}>+ 添加玩家</button>
            )}
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button--primary button--large button--full" type="submit">创建并开始 <ArrowIcon /></button>
        </form>
      </main>
    </div>
  )
}

function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const room = useScoreboardStore((state) => state.rooms.find((item) => item.id === roomId))
  const allBatches = useScoreboardStore((state) => state.batches)
  const voidTransfer = useScoreboardStore((state) => state.voidTransfer)
  const endRoom = useScoreboardStore((state) => state.endRoom)
  const [editor, setEditor] = useState<TransferBatch | 'new' | null>(null)
  const [showAll, setShowAll] = useState(false)

  const roomBatches = useMemo(
    () => allBatches.filter((batch) => batch.roomId === roomId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allBatches, roomId],
  )
  const scores = useMemo(() => (room ? calculateScores(room, roomBatches) : []), [room, roomBatches])

  if (!room) return <Navigate to="/" replace />
  const activeCount = roomBatches.filter((batch) => batch.status === 'active').length

  const handleEnd = async () => {
    if (!window.confirm('结束后将不能继续记分，确认结束这场牌局吗？')) return
    await endRoom(room.id)
  }

  return (
    <div className="page page--room">
      <AppHeader backTo="/" />
      <main>
        <header className="room-titlebar">
          <div>
            <p className="eyebrow">{room.status === 'active' ? '进行中' : '已结束'} · {activeCount} 笔给分</p>
            <h1>{room.name}</h1>
          </div>
          <button className="text-button" onClick={() => setShowAll((value) => !value)}>{showAll ? '收起流水' : '全部流水'}</button>
        </header>

        <section className="table-scoreboard" aria-label="当前积分">
          <div className="table-scoreboard__center">
            <span>牌桌总分</span>
            <strong>{scores.reduce((sum, player) => sum + player.score, 0)}</strong>
            <small>{assertZeroSum(scores) ? '账目已平' : '需要核对'}</small>
          </div>
          <div className="score-grid">
            {scores.map((player, index) => (
              <article className={`score-card ${player.score > 0 ? 'score-card--positive' : player.score < 0 ? 'score-card--negative' : ''}`} key={player.id}>
                <div className="score-card__seat">{['东', '南', '西', '北', '五', '六', '七', '八'][index]}</div>
                <p>{player.name}</p>
                <strong>{scoreLabel(player.score)}</strong>
              </article>
            ))}
          </div>
        </section>

        {room.status === 'active' && (
          <button className="deal-button" onClick={() => setEditor('new')}>
            <span className="deal-button__mark">给</span>
            <span><strong>记一笔给分</strong><small>支持一次给多人</small></span>
            <ArrowIcon />
          </button>
        )}

        <section className="ledger-section">
          <div className="section-heading">
            <h2>{room.status === 'ended' ? '完整流水' : '最近流水'}</h2>
            <span>总分始终为 0</span>
          </div>
          {roomBatches.length === 0 ? (
            <div className="empty-ledger"><p>还没有给分记录</p><span>第一笔会出现在这里</span></div>
          ) : (
            <div className="ledger-list">
              {(showAll ? roomBatches : roomBatches.slice(0, 4)).map((batch) => (
                <LedgerRow
                  key={batch.id}
                  batch={batch}
                  players={room.players}
                  editable={room.status === 'active'}
                  onEdit={() => setEditor(batch)}
                  onVoid={() => voidTransfer(batch.id)}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="room-footer">
          {room.status === 'active' ? (
            <button className="button button--danger-quiet" onClick={handleEnd}>结束这场牌局</button>
          ) : (
            <button className="button button--ghost" onClick={() => navigate('/')}>返回首页</button>
          )}
        </footer>
      </main>

      {editor && (
        <TransferSheet room={room} batch={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />
      )}
    </div>
  )
}

function LedgerRow({ batch, players, editable, onEdit, onVoid }: {
  batch: TransferBatch
  players: Player[]
  editable: boolean
  onEdit: () => void
  onVoid: () => void
}) {
  const playerName = (id: string) => players.find((player) => player.id === id)?.name ?? '未知玩家'
  return (
    <article className={`ledger-row ${batch.status === 'voided' ? 'ledger-row--voided' : ''}`}>
      <div className="ledger-row__stamp">{playerName(batch.giverId).slice(0, 1)}</div>
      <div className="ledger-row__content">
        <div className="ledger-row__line">
          <p><strong>{playerName(batch.giverId)}</strong> 给出 <b>{batchTotal(batch)}</b> 分</p>
          <time>{formatDate(batch.createdAt)}</time>
        </div>
        <p className="ledger-row__recipients">
          {batch.transfers.map((transfer) => `${playerName(transfer.recipientId)} +${transfer.amount}`).join(' · ')}
        </p>
        {batch.note && <p className="ledger-row__note">“{batch.note}”</p>}
        {batch.status === 'voided' && <span className="void-label">已撤销</span>}
        {editable && batch.status === 'active' && (
          <div className="ledger-row__actions">
            <button onClick={onEdit}>修改</button>
            <button onClick={onVoid}>撤销</button>
          </div>
        )}
      </div>
    </article>
  )
}

function TransferSheet({ room, batch, onClose }: { room: Room; batch?: TransferBatch; onClose: () => void }) {
  const saveTransfer = useScoreboardStore((state) => state.saveTransfer)
  const [giverId, setGiverId] = useState(batch?.giverId ?? room.players[0].id)
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(batch?.transfers.map((transfer) => [transfer.recipientId, String(transfer.amount)]) ?? []),
  )
  const [note, setNote] = useState(batch?.note ?? '')
  const [error, setError] = useState('')
  const giver = room.players.find((player) => player.id === giverId)!
  const recipients = room.players.filter((player) => player.id !== giverId)
  const transfers: Transfer[] = recipients
    .map((player) => ({ recipientId: player.id, amount: Number(amounts[player.id]) }))
    .filter((transfer) => Number.isInteger(transfer.amount) && transfer.amount > 0)
  const total = transfers.reduce((sum, transfer) => sum + transfer.amount, 0)

  const handleGiverChange = (id: string) => {
    setGiverId(id)
    setAmounts((current) => ({ ...current, [id]: '' }))
    setError('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await saveTransfer({ roomId: room.id, giverId, transfers, note, batchId: batch?.id })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请重试')
    }
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="transfer-sheet" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <div><p className="eyebrow">{batch ? '修改流水' : '批量给分'}</p><h2 id="transfer-title">这局谁给分？</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="giver-tabs" role="radiogroup" aria-label="给分人">
            {room.players.map((player) => (
              <button
                type="button"
                role="radio"
                aria-checked={giverId === player.id}
                className={giverId === player.id ? 'is-active' : ''}
                onClick={() => handleGiverChange(player.id)}
                key={player.id}
              >{player.name}</button>
            ))}
          </div>

          <div className="recipient-list">
            <p className="input-caption">分别给多少分</p>
            {recipients.map((player) => (
              <label className="recipient-row" key={player.id}>
                <span>{player.name}</span>
                <div className="amount-input">
                  <button type="button" aria-label={`${player.name}减一分`} onClick={() => setAmounts((current) => ({ ...current, [player.id]: String(Math.max(0, Number(current[player.id] || 0) - 1) || '') }))}>−</button>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label={`给${player.name}的分数`}
                    value={amounts[player.id] ?? ''}
                    onChange={(event) => setAmounts((current) => ({ ...current, [player.id]: event.target.value.replace(/\D/g, '') }))}
                    placeholder="0"
                  />
                  <button type="button" aria-label={`${player.name}加一分`} onClick={() => setAmounts((current) => ({ ...current, [player.id]: String(Number(current[player.id] || 0) + 1) }))}>＋</button>
                </div>
              </label>
            ))}
          </div>

          <label className="field field--compact">
            <span>备注 <small>可选</small></span>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：自摸、炸弹" maxLength={24} />
          </label>

          <div className="transfer-summary">
            <div><span>本次共给出</span><strong>{total}</strong><small>分</small></div>
            <p>{giver.name} 将扣除 <b>{total}</b> 分</p>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button button--primary button--large button--full" disabled={total === 0}>
            {batch ? '保存修改' : '确认给分'} <span>−{total}</span>
          </button>
        </form>
      </section>
    </div>
  )
}

export default function App() {
  const hydrated = useScoreboardStore((state) => state.hydrated)
  const load = useScoreboardStore((state) => state.load)
  useEffect(() => { void load() }, [load])

  if (!hydrated) return <LoadingScreen />

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreateRoomPage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

