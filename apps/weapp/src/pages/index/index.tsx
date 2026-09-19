import { useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import type { Room, WinnerOperation } from '../../domain/models'
import { scoreboardRepository } from '../../infrastructure/storage'
import './index.css'

const isThisMonth = (value: string) => {
  const date = new Date(value)
  const current = new Date()
  return date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth()
}

export default function Index() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [operations, setOperations] = useState<WinnerOperation[]>([])
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    void Promise.all([scoreboardRepository.listRooms(), scoreboardRepository.listOperations()]).then(([nextRooms, nextOperations]) => {
      setRooms(nextRooms)
      setOperations(nextOperations)
      setLoading(false)
    })
  })

  const activeOperations = useMemo(
    () => operations.filter((operation) => operation.status === 'active'),
    [operations],
  )
  const monthOperations = activeOperations.filter((operation) => isThisMonth(operation.createdAt))
  const monthTurnover = monthOperations.reduce((sum, operation) => sum + operation.winAmount, 0)
  const activeRooms = rooms.filter((room) => room.status === 'active')
  const endedRooms = rooms.filter((room) => room.status === 'ended')
  const currentRoom = activeRooms[0]
  const monthLabel = `${new Date().getMonth() + 1}月`

  const openCreate = () => Taro.navigateTo({ url: '/pages/create/index' })
  const openRoom = (roomId: string) => Taro.navigateTo({ url: `/pages/room/index?roomId=${roomId}` })
  const quickRecord = () => currentRoom
    ? Taro.navigateTo({ url: `/pages/record/index?roomId=${currentRoom.id}` })
    : openCreate()
  const showComingSoon = (title: string) => Taro.showToast({ title: `${title}正在准备中`, icon: 'none' })

  return (
    <View className='home-shell'>
      <View className='top-ribbon' />

      <View className='home-content'>
        <View className='brand-header'>
          <View className='brand-lockup'>
            <View className='brand-tiles'><Text>●</Text><Text>●</Text><Text>●</Text><Text>●</Text></View>
            <View>
              <Text className='brand-name'>雀友记账</Text>
              <Text className='brand-caption'>记录每一局的精彩</Text>
            </View>
          </View>
          <View className='notice-button' onClick={() => void showComingSoon('消息中心')}>
            <Text className='notice-bell'>♧</Text>
          </View>
        </View>

        <View className='month-card'>
          <View className='floating-tile tile-fa'><Text>發</Text></View>
          <View className='floating-tile tile-zhong'><Text>中</Text></View>
          <View className='month-copy'>
            <View className='month-heading'>
              <Text>本月记账</Text><Text className='month-chip'>{monthLabel}</Text>
            </View>
            <View className='month-amount'><Text>{monthTurnover.toLocaleString()}</Text><Text>分</Text></View>
            <View className='month-stats'>
              <View><Text className='stat-icon stat-green'>↗</Text><Text>进行 {activeRooms.length} 场</Text></View>
              <View><Text className='stat-icon stat-pink'>✓</Text><Text>结束 {endedRooms.length} 场</Text></View>
              <View><Text className='stat-icon stat-yellow'>＝</Text><Text>记录 {monthOperations.length} 局</Text></View>
            </View>
          </View>
        </View>

        {currentRoom ? (
          <View className='current-card'>
            <View className='current-main'>
              <View className='mahjong-tile current-tile'>
                <Text>東</Text><Text className='round-badge'>{activeOperations.filter((operation) => operation.roomId === currentRoom.id).length}</Text>
              </View>
              <View className='current-copy'>
                <View className='current-title'><Text>{currentRoom.name}</Text><Text>进行中</Text></View>
                <Text className='current-meta'>{currentRoom.players.length}人 · 第 {activeOperations.filter((operation) => operation.roomId === currentRoom.id).length + 1} 局待记录</Text>
              </View>
            </View>
            <View className='continue-button' onClick={() => void openRoom(currentRoom.id)}>继续</View>
          </View>
        ) : !loading && (
          <View className='current-card empty-current' onClick={() => void openCreate()}>
            <View className='current-main'>
              <View className='mahjong-tile current-tile'><Text>東</Text></View>
              <View className='current-copy'><Text className='empty-current-title'>还没有进行中的牌局</Text><Text className='current-meta'>叫上牌友，开一桌新牌局</Text></View>
            </View>
            <View className='continue-button'>开局</View>
          </View>
        )}

        <View className='section-block quick-section'>
          <View className='section-label'><Text className='label-bar mint-bar' /><Text>快捷入口</Text></View>
          <View className='quick-grid'>
            <View className='quick-item' onClick={() => void openCreate()}>
              <View className='mahjong-tile quick-tile quick-mint'><Text className='quick-symbol'>＋</Text></View><Text>新建牌局</Text>
            </View>
            <View className='quick-item' onClick={() => void quickRecord()}>
              <View className='mahjong-tile quick-tile quick-amber'><Text className='quick-symbol note-symbol'>▤</Text></View><Text>快速记账</Text>
            </View>
            <View className='quick-item' onClick={() => void showComingSoon('战绩统计')}>
              <View className='mahjong-tile quick-tile quick-sky'><Text className='quick-symbol chart-symbol'>⌁</Text></View><Text>战绩统计</Text>
            </View>
            <View className='quick-item' onClick={() => void showComingSoon('牌友圈')}>
              <View className='mahjong-tile quick-tile quick-rose'><Text className='quick-symbol friend-symbol'>♙</Text></View><Text>牌友圈</Text>
            </View>
          </View>
        </View>

      </View>

      <View className='bottom-nav'>
        <View className='nav-item nav-active'><View className='nav-icon'>⌂</View><Text>首页</Text></View>
        <View className='nav-item' onClick={() => void Taro.redirectTo({ url: '/pages/games/index' })}><View className='nav-icon'>▱</View><Text>牌局</Text></View>
        <View className='nav-create' onClick={() => void openCreate()}><Text>＋</Text></View>
        <View className='nav-item' onClick={() => void showComingSoon('统计')}><View className='nav-icon'>▥</View><Text>统计</Text></View>
        <View className='nav-item' onClick={() => void showComingSoon('个人中心')}><View className='nav-icon'>♙</View><Text>我的</Text></View>
      </View>
    </View>
  )
}
