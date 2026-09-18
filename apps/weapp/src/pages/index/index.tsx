import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import type { Room, WinnerOperation } from '../../domain/models'
import { calculateScores, scoreLabel } from '../../domain/score'
import { scoreboardRepository } from '../../infrastructure/storage'
import { formatDate } from '../../utils'
import './index.css'

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

  const activeRooms = rooms.filter((room) => room.status === 'active')
  const endedRooms = rooms.filter((room) => room.status === 'ended')

  const openRoom = (roomId: string) => Taro.navigateTo({ url: `/pages/room/index?roomId=${roomId}` })

  const renderRooms = (title: string, items: Room[]) => (
    <View className='room-section'>
      <View className='section-heading'>
        <Text className='section-title'>{title}</Text>
        <Text className='section-count'>{items.length} 局</Text>
      </View>
      <View className='room-list'>
        {items.map((room) => {
          const roomOperations = operations.filter((operation) => operation.roomId === room.id)
          const scores = calculateScores(room, roomOperations)
          const leader = [...scores].sort((left, right) => right.score - left.score)[0]
          return (
            <View className='room-row' key={room.id} onClick={() => void openRoom(room.id)}>
              <View className='room-copy'>
                <Text className='room-name'>{room.name}</Text>
                <Text className='room-meta'>{room.players.length} 人 · {roomOperations.filter((item) => item.status === 'active').length} 笔 · {formatDate(room.createdAt)}</Text>
              </View>
              <View className='room-leader'>
                <Text>{leader?.name}</Text>
                <Text className='leader-score'>{scoreLabel(leader?.score ?? 0)}</Text>
              </View>
              <Text className='arrow'>›</Text>
            </View>
          )
        })}
      </View>
    </View>
  )

  return (
    <View className='page home-page'>
      <View className='brand-row'>
        <View className='brand-mark'>
          <View className='pip-row'><Text>●</Text><Text>●</Text></View>
          <View className='pip-row'><Text>●</Text><Text>●</Text></View>
        </View>
        <Text className='wordmark'>SCOREBOARD</Text>
      </View>

      <View className='hero'>
        <View className='hero-copy'>
          <Text className='eyebrow'>牌局记清楚，输赢不糊涂</Text>
          <Text className='hero-title'>把分记在桌上，{`\n`}把心留在牌里。</Text>
          <Text className='hero-note'>麻将、扑克都能用。选出本局赢家，最后一人的支出自动算平。</Text>
        </View>
        <View className='zero-seal'>
          <Text className='zero-number'>0</Text>
          <Text className='zero-label'>总分恒定</Text>
        </View>
      </View>

      <View className='primary-button' onClick={() => void Taro.navigateTo({ url: '/pages/create/index' })}>
        <Text>创建新牌局</Text><Text className='button-arrow'>→</Text>
      </View>

      {!loading && activeRooms.length > 0 && renderRooms('继续牌局', activeRooms)}
      {!loading && endedRooms.length > 0 && renderRooms('历史牌局', endedRooms)}

      {!loading && rooms.length === 0 && (
        <View className='empty-guide'>
          <Text className='eyebrow'>三步完成</Text>
          {['添加 2–8 位玩家', '选择赢家并填写本局输赢', '一次确认，自动算平'].map((step, index) => (
            <View className='guide-row' key={step}>
              <Text className='guide-number'>{index + 1}</Text><Text>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
