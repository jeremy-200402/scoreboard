import { useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import type { Room, WinnerOperation } from '../../domain/models'
import { calculateScores, scoreLabel } from '../../domain/score'
import { scoreboardRepository } from '../../infrastructure/storage'
import { formatDate, now } from '../../utils'
import './index.css'

const seats = ['东', '南', '西', '北', '五', '六', '七', '八']

export default function RoomPage() {
  const router = useRouter()
  const roomId = router.params.roomId ?? ''
  const [room, setRoom] = useState<Room | null>(null)
  const [operations, setOperations] = useState<WinnerOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const menuButton = Taro.getMenuButtonBoundingClientRect()
  const navigationStyle = { paddingTop: `${menuButton.top}px`, height: `${menuButton.bottom + 8}px` }

  const goBack = () => Taro.getCurrentPages().length > 1
    ? Taro.navigateBack()
    : Taro.reLaunch({ url: '/pages/home/index' })

  const refresh = async () => {
    const [rooms, allOperations] = await Promise.all([
      scoreboardRepository.listRooms(),
      scoreboardRepository.listOperations(),
    ])
    setRoom(rooms.find((item) => item.id === roomId) ?? null)
    setOperations(allOperations.filter((operation) => operation.roomId === roomId))
    setLoading(false)
  }

  useDidShow(() => { void refresh() })

  const scores = useMemo(() => room ? calculateScores(room, operations) : [], [room, operations])
  const activeOperations = operations.filter((operation) => operation.status === 'active')

  const voidOperation = async (operation: WinnerOperation) => {
    const result = await Taro.showModal({ title: '撤销这笔记录？', content: '撤销后积分会重新计算，记录仍保留在流水中。', confirmColor: '#c44738' })
    if (!result.confirm) return
    await scoreboardRepository.saveOperation({ ...operation, status: 'voided', updatedAt: now() })
    await refresh()
  }

  const endRoom = async () => {
    if (!room) return
    const result = await Taro.showModal({ title: '结束这场牌局？', content: '结束后将不能继续记分。', confirmColor: '#c44738' })
    if (!result.confirm) return
    await scoreboardRepository.saveRoom({ ...room, status: 'ended', endedAt: now() })
    await refresh()
  }

  if (loading) return <View className='room-shell'><View className='subpage-ribbon' /><View className='room-loading'>正在摆好记分牌…</View></View>
  if (!room) return <View className='room-shell'><View className='subpage-ribbon' /><View className='room-loading'>没有找到这场牌局</View></View>

  return (
    <View className='room-shell'>
      <View className='subpage-ribbon' />
      <View className='subpage-nav' style={navigationStyle}>
        <View className='back-button' onClick={() => void goBack()}><Text>‹</Text></View>
        <Text className='subpage-nav-title'>牌局详情</Text>
        <View className='nav-placeholder' />
      </View>

      <View className='page room-page'>
        <View className='room-titlebar'>
          <View>
            <Text className='eyebrow'>{room.status === 'active' ? '进行中' : '已结束'} · {activeOperations.length} 局记录</Text>
            <Text className='room-title'>{room.name}</Text>
          </View>
          <Text className='text-action' onClick={() => setShowAll((value) => !value)}>{showAll ? '收起流水' : '全部流水'}</Text>
        </View>

        <View className='table-scoreboard'>
          <View className='score-grid'>
            {scores.map((player, index) => (
              <View className='score-card' key={player.id}>
                <Text className='seat'>{seats[index]}</Text>
                <Text className='player-name'>{player.name}</Text>
                <Text className={`player-score ${player.score > 0 ? 'positive' : player.score < 0 ? 'negative' : ''}`}>{scoreLabel(player.score)}</Text>
              </View>
            ))}
          </View>
        </View>

        {room.status === 'active' && (
          <View className='deal-button' onClick={() => void Taro.navigateTo({ url: `/pages/record/index?roomId=${room.id}` })}>
            <Text className='deal-mark'>记</Text>
            <Text className='deal-label'>记录本局</Text>
            <Text className='deal-arrow'>→</Text>
          </View>
        )}

        <View className='ledger-section'>
          <View className='section-heading'>
            <Text className='section-title'>{room.status === 'ended' ? '完整流水' : '最近流水'}</Text>
          </View>
          {operations.length === 0 ? (
            <View className='empty-ledger'><View className='empty-ledger-tile'><Text>記</Text></View><Text>还没有本局记录</Text></View>
          ) : (
            <View className='ledger-list'>
              {(showAll ? operations : operations.slice(0, 4)).map((operation) => {
                const winner = room.players.find((player) => player.id === operation.winnerId)
                return (
                  <View className={`ledger-row ${operation.status === 'voided' ? 'is-voided' : ''}`} key={operation.id}>
                    <View className='winner-stamp'><Text>{winner?.name.slice(0, 1)}</Text></View>
                    <View className='ledger-content'>
                      <View className='ledger-line'>
                        <Text><Text className='winner-name'>{winner?.name}</Text> 赢得 <Text className='win-score'>{operation.winAmount}</Text> 分</Text>
                        <Text className='ledger-time'>{formatDate(operation.createdAt)}</Text>
                      </View>
                      <Text className='loss-detail'>{operation.losses.map((loss) => `${room.players.find((player) => player.id === loss.playerId)?.name} −${loss.amount}`).join(' · ')}</Text>
                      {operation.note && <Text className='operation-note'>“{operation.note}”</Text>}
                      {operation.status === 'voided' ? (
                        <Text className='void-label'>已撤销</Text>
                      ) : room.status === 'active' && (
                        <View className='ledger-actions'>
                          <Text onClick={() => void Taro.navigateTo({ url: `/pages/record/index?roomId=${room.id}&operationId=${operation.id}` })}>修改</Text>
                          <Text onClick={() => void voidOperation(operation)}>撤销</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {room.status === 'active' && <Text className='end-room' onClick={() => void endRoom()}>结束这场牌局</Text>}
      </View>
    </View>
  )
}
