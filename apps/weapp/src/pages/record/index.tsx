import { useEffect, useMemo, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import type { PlayerLoss, Room, WinnerOperation } from '../../domain/models'
import { calculateAutoLoss, validateWinnerOperation } from '../../domain/score'
import { scoreboardRepository } from '../../infrastructure/storage'
import { makeId, now } from '../../utils'
import './index.css'

export default function RecordPage() {
  const router = useRouter()
  const roomId = router.params.roomId ?? ''
  const operationId = router.params.operationId
  const [room, setRoom] = useState<Room | null>(null)
  const [existing, setExisting] = useState<WinnerOperation | null>(null)
  const [winnerId, setWinnerId] = useState('')
  const [winAmount, setWinAmount] = useState('')
  const [lossAmounts, setLossAmounts] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([scoreboardRepository.listRooms(), scoreboardRepository.listOperations()]).then(([rooms, operations]) => {
      const nextRoom = rooms.find((item) => item.id === roomId) ?? null
      const nextExisting = operationId ? operations.find((item) => item.id === operationId) ?? null : null
      setRoom(nextRoom)
      setExisting(nextExisting)
      if (nextRoom) {
        const initialWinnerId = nextExisting?.winnerId ?? nextRoom.players[0].id
        setWinnerId(initialWinnerId)
        setWinAmount(nextExisting ? String(nextExisting.winAmount) : '')
        setLossAmounts(Object.fromEntries(nextExisting?.losses.map((loss) => [loss.playerId, String(loss.amount)]) ?? []))
        setNote(nextExisting?.note ?? '')
      }
      setLoading(false)
    })
  }, [operationId, roomId])

  const winner = room?.players.find((player) => player.id === winnerId)
  const losers = useMemo(() => room?.players.filter((player) => player.id !== winnerId) ?? [], [room, winnerId])
  const autoPlayerId = losers.at(-1)?.id ?? ''
  const manualLosers = losers.filter((player) => player.id !== autoPlayerId)
  const target = Number(winAmount)
  const manualAmounts = manualLosers.map((player) => Number(lossAmounts[player.id]))
  const canAutoFill = target > 0 && manualAmounts.every((amount) => Number.isInteger(amount) && amount > 0)
  const autoAmount = canAutoFill ? calculateAutoLoss(target, manualAmounts) : 0
  const losses: PlayerLoss[] = losers.map((player) => ({
    playerId: player.id,
    amount: player.id === autoPlayerId ? autoAmount : Number(lossAmounts[player.id]),
  }))
  const lossTotal = losses.reduce((sum, loss) => sum + (Number.isFinite(loss.amount) ? loss.amount : 0), 0)
  const validationError = room ? validateWinnerOperation({ room, winnerId, winAmount: target, losses }) : '牌局不存在'
  const isBalanced = validationError === null

  const balanceLabel = !target
    ? '先填写赢家赢分'
    : !canAutoFill
      ? '填写其他输家的支出'
      : autoAmount <= 0
        ? '请为最后一人留出支出'
        : isBalanced ? '本局已算平' : '赢家和输家尚未算平'

  const changeWinner = (nextWinnerId: string) => {
    setWinnerId(nextWinnerId)
    setLossAmounts({})
    setError('')
  }

  const updateLoss = (playerId: string, rawValue: string) => {
    setLossAmounts((current) => ({ ...current, [playerId]: rawValue.replace(/\D/g, '') }))
    setError('')
  }

  const save = async () => {
    if (!room || !winner) return
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    const timestamp = now()
    const operation: WinnerOperation = {
      id: existing?.id ?? makeId(),
      roomId: room.id,
      operatorId: existing?.operatorId ?? winner.id,
      kind: 'winner',
      winnerId: winner.id,
      winAmount: target,
      losses,
      note: note.trim(),
      status: 'active',
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    try {
      await scoreboardRepository.saveOperation(operation)
      await Taro.navigateBack()
    } catch {
      setSaving(false)
      setError('保存失败，请重试')
    }
  }

  if (loading) return <View className='loading-state'>正在准备本局…</View>
  if (!room || !winner) return <View className='loading-state'>没有找到这场牌局</View>

  return (
    <View className='page record-page'>
      <Text className='eyebrow'>{existing ? '修改本局' : '记录本局'}</Text>
      <Text className='page-title'>这局谁赢了？</Text>
      <Text className='page-lead'>选定赢家后，其他人默认为输家。最后一人的支出会自动补齐。</Text>

      <View className='winner-tabs'>
        {room.players.map((player) => (
          <Text
            className={`winner-tab ${winnerId === player.id ? 'is-active' : ''}`}
            key={player.id}
            onClick={() => changeWinner(player.id)}
          >{player.name}</Text>
        ))}
      </View>

      <Text className='input-caption'>填写本局输赢</Text>
      <View className='entry-list'>
        <View className='entry-row winner-row'>
          <View className='entry-player'><Text>{winner.name}</Text><Text>赢家</Text></View>
          <Text className='entry-sign'>＋</Text>
          <Input
            className='score-input'
            type='number'
            value={winAmount}
            placeholder='0'
            onInput={(event) => { setWinAmount(event.detail.value.replace(/\D/g, '')); setError('') }}
          />
        </View>
        {losers.map((player) => {
          const isAuto = player.id === autoPlayerId
          return (
            <View className={`entry-row ${isAuto ? 'auto-row' : ''}`} key={player.id}>
              <View className='entry-player'><Text>{player.name}</Text><Text>{isAuto ? '自动补齐' : '输家支出'}</Text></View>
              <Text className='entry-sign loss-sign'>−</Text>
              <Input
                className='score-input'
                type='number'
                disabled={isAuto}
                value={isAuto ? (canAutoFill && autoAmount > 0 ? String(autoAmount) : '') : (lossAmounts[player.id] ?? '')}
                placeholder='0'
                onInput={(event) => updateLoss(player.id, event.detail.value)}
              />
            </View>
          )
        })}
      </View>

      <View className={`balance-strip ${isBalanced ? 'is-balanced' : ''}`}>
        <Text>{balanceLabel}</Text><Text>＋{target || 0} / −{lossTotal}</Text>
      </View>

      <View className='note-field'>
        <Text>备注 <Text className='optional'>可选</Text></Text>
        <Input className='text-input' value={note} maxlength={24} placeholder='例如：自摸、炸弹' onInput={(event) => setNote(event.detail.value)} />
      </View>

      {error && <Text className='form-error'>{error}</Text>}
      <View className={`primary-button ${!isBalanced || saving ? 'is-disabled' : ''}`} onClick={() => isBalanced && !saving && void save()}>
        <Text>{saving ? '正在保存…' : existing ? '保存修改' : '确认本局'}</Text><Text className='button-score'>＋{target || 0}</Text>
      </View>
    </View>
  )
}
