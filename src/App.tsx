import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import type { Player, PlayerLoss, Room, ScoreOperation } from './domain/models'
import { assertZeroSum, calculateScores, isWinnerOperation, operationTotal } from './domain/score'
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
            <p className="hero-note">麻将、扑克都能用。选出本局赢家，最后一人的支出自动算平。</p>
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
              <li><span>2</span>选择赢家并填写本局输赢</li>
              <li><span>3</span>一次确认，自动算平</li>
            </ol>
          </section>
        )}
      </main>
    </div>
  )
}

function RoomList({ title, rooms, batches }: { title: string; rooms: Room[]; batches: ScoreOperation[] }) {
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
        <p className="page-lead">所有人从 0 分开始，每局选择一位赢家，系统自动核对输赢平衡。</p>

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
  const [editor, setEditor] = useState<ScoreOperation | 'new' | null>(null)
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
            <p className="eyebrow">{room.status === 'active' ? '进行中' : '已结束'} · {activeCount} 局记录</p>
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
            <span className="deal-button__mark">记</span>
            <span><strong>记录本局</strong><small>选赢家，填写每人输赢</small></span>
            <ArrowIcon />
          </button>
        )}

        <section className="ledger-section">
          <div className="section-heading">
            <h2>{room.status === 'ended' ? '完整流水' : '最近流水'}</h2>
            <span>总分始终为 0</span>
          </div>
          {roomBatches.length === 0 ? (
            <div className="empty-ledger"><p>还没有本局记录</p><span>第一局结果会出现在这里</span></div>
          ) : (
            <div className="ledger-list">
              {(showAll ? roomBatches : roomBatches.slice(0, 4)).map((batch) => (
                <LedgerRow
                  key={batch.id}
                  batch={batch}
                  players={room.players}
                  editable={room.status === 'active' && isWinnerOperation(batch)}
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
  batch: ScoreOperation
  players: Player[]
  editable: boolean
  onEdit: () => void
  onVoid: () => void
}) {
  const playerName = (id: string) => players.find((player) => player.id === id)?.name ?? '未知玩家'
  const winnerMode = isWinnerOperation(batch)
  const focusPlayerId = winnerMode ? batch.winnerId : batch.giverId
  return (
    <article className={`ledger-row ${batch.status === 'voided' ? 'ledger-row--voided' : ''}`}>
      <div className="ledger-row__stamp">{playerName(focusPlayerId).slice(0, 1)}</div>
      <div className="ledger-row__content">
        <div className="ledger-row__line">
          <p>
            <strong>{playerName(focusPlayerId)}</strong>
            {winnerMode ? ' 赢得 ' : ' 给出 '}
            <b>{operationTotal(batch)}</b> 分
          </p>
          <time>{formatDate(batch.createdAt)}</time>
        </div>
        <p className="ledger-row__recipients">
          {winnerMode
            ? batch.losses.map((loss) => `${playerName(loss.playerId)} −${loss.amount}`).join(' · ')
            : batch.transfers.map((transfer) => `${playerName(transfer.recipientId)} +${transfer.amount}`).join(' · ')}
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

function TransferSheet({ room, batch, onClose }: { room: Room; batch?: ScoreOperation; onClose: () => void }) {
  const saveOperation = useScoreboardStore((state) => state.saveOperation)
  const editableBatch = batch && isWinnerOperation(batch) ? batch : undefined
  const initialWinnerId = editableBatch?.winnerId ?? room.players[0].id
  const initialAutoPlayerId = room.players.filter((player) => player.id !== initialWinnerId).at(-1)?.id
  const [winnerId, setWinnerId] = useState(initialWinnerId)
  const [winAmount, setWinAmount] = useState(editableBatch ? String(editableBatch.winAmount) : '')
  const [lossAmounts, setLossAmounts] = useState<Record<string, string>>(
    Object.fromEntries(editableBatch?.losses.filter((loss) => loss.playerId !== initialAutoPlayerId).map((loss) => [loss.playerId, String(loss.amount)]) ?? []),
  )
  const [note, setNote] = useState(batch?.note ?? '')
  const [error, setError] = useState('')
  const winner = room.players.find((player) => player.id === winnerId)!
  const losers = room.players.filter((player) => player.id !== winnerId)
  const target = Number(winAmount)
  const autoPlayerId = losers.at(-1)?.id ?? null
  const manualLosers = losers.filter((player) => player.id !== autoPlayerId)
  const canAutoFill = Number.isInteger(target) && target > 0 && manualLosers.every((player) => Number(lossAmounts[player.id]) > 0)
  const filledLossTotal = manualLosers.reduce((sum, player) => sum + Number(lossAmounts[player.id] || 0), 0)
  const autoAmount = canAutoFill ? target - filledLossTotal : 0
  const losses: PlayerLoss[] = losers.map((player) => ({
    playerId: player.id,
    amount: player.id === autoPlayerId ? autoAmount : Number(lossAmounts[player.id]),
  }))
  const lossTotal = losses.reduce((sum, loss) => sum + (Number.isFinite(loss.amount) ? loss.amount : 0), 0)
  const isBalanced = target > 0 && lossTotal === target && losses.every((loss) => Number.isInteger(loss.amount) && loss.amount > 0)
  const balanceLabel = !target
    ? '先填写赢家赢分'
    : !canAutoFill
      ? '填写其他输家的支出'
      : autoAmount <= 0
        ? '请为最后一人留出支出'
        : isBalanced ? '本局已算平' : `还差 ${Math.abs(target - lossTotal)} 分`

  const handleWinnerChange = (id: string) => {
    setWinnerId(id)
    setLossAmounts({})
    setError('')
  }

  const updateLoss = (playerId: string, value: string) => {
    setLossAmounts((current) => ({ ...current, [playerId]: value.replace(/\D/g, '') }))
    setError('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await saveOperation({ roomId: room.id, winnerId, winAmount: target, losses, note, batchId: batch?.id })
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
          <div><p className="eyebrow">{batch ? '修改本局' : '记录本局'}</p><h2 id="transfer-title">这局谁赢了？</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="giver-tabs" role="radiogroup" aria-label="选择赢家">
            {room.players.map((player) => (
              <button
                type="button"
                role="radio"
                aria-checked={winnerId === player.id}
                className={winnerId === player.id ? 'is-active' : ''}
                onClick={() => handleWinnerChange(player.id)}
                key={player.id}
              >{player.name}</button>
            ))}
          </div>

          <div className="score-entry-list">
            <p className="input-caption">填写本局输赢</p>
            <label className="score-entry-row score-entry-row--winner">
              <span className="score-entry-player"><b>{winner.name}</b><small>赢家</small></span>
              <span className="score-entry-sign">＋</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`${winner.name}赢的分数`}
                value={winAmount}
                onChange={(event) => { setWinAmount(event.target.value.replace(/\D/g, '')); setError('') }}
                placeholder="0"
              />
            </label>
            {losers.map((player) => {
              const isAuto = player.id === autoPlayerId
              return (
                <label className={`score-entry-row ${isAuto ? 'score-entry-row--auto' : ''}`} key={player.id}>
                  <span className="score-entry-player"><b>{player.name}</b><small>{isAuto ? '自动补齐' : '输家支出'}</small></span>
                  <span className="score-entry-sign">−</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label={`${player.name}支出的分数`}
                    value={isAuto ? (canAutoFill && autoAmount > 0 ? String(autoAmount) : '') : (lossAmounts[player.id] ?? '')}
                    onChange={(event) => updateLoss(player.id, event.target.value)}
                    placeholder="0"
                    readOnly={isAuto}
                  />
                </label>
              )
            })}
            <div className={`balance-strip ${isBalanced ? 'is-balanced' : ''}`}>
              <span>{balanceLabel}</span>
              <strong>＋{target || 0} / −{lossTotal}</strong>
            </div>
          </div>

          <p className="auto-hint">填完赢家和其他输家的分数，最后一人的支出会自动计算。</p>

          <label className="field field--compact">
            <span>备注 <small>可选</small></span>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：自摸、炸弹" maxLength={24} />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="button button--primary button--large button--full" disabled={!isBalanced}>
            {batch ? '保存修改' : '确认本局'} <span>＋{target || 0}</span>
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
