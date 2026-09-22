import { useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import type { Room, RoomStatus, WinnerOperation } from '../../domain/models'
import { calculateScores, scoreLabel } from '../../domain/score'
import { scoreboardRepository } from '../../infrastructure/storage'
import './index.css'

type RoomFilter = 'all' | RoomStatus

const tileMarks = ['一', '發', '中', '北']
const avatarColors = ['mint', 'amber', 'rose', 'sky']

const formatRoomDate = (value: string) => {
  const date = new Date(value)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export default function GamesPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [operations, setOperations] = useState<WinnerOperation[]>([])
  const [filter, setFilter] = useState<RoomFilter>('all')
  const [loading, setLoading] = useState(true)
  const menuButton = Taro.getMenuButtonBoundingClientRect()
  const headerStyle = { paddingTop: `${menuButton.bottom + 12}px` }

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
  const visibleRooms = filter === 'all' ? rooms : rooms.filter((room) => room.status === filter)
  const activeCount = rooms.filter((room) => room.status === 'active').length
  const endedCount = rooms.filter((room) => room.status === 'ended').length

  const roomScore = (room: Room) => {
    const scores = calculateScores(room, activeOperations.filter((operation) => operation.roomId === room.id))
    return [...scores].sort((left, right) => right.score - left.score)[0]?.score ?? 0
  }

  const roomRecords = (roomId: string) => activeOperations.filter((operation) => operation.roomId === roomId).length
  const openCreate = () => Taro.navigateTo({ url: '/pages/create/index' })
  const openRoom = (roomId: string) => Taro.navigateTo({ url: `/pages/room/index?roomId=${roomId}` })
  const openStats = () => Taro.redirectTo({ url: '/pages/stats/index' })
  const showComingSoon = (title: string) => Taro.showToast({ title: `${title}正在准备中`, icon: 'none' })

  return (
    <View className='games-shell'>
      <View className='games-ribbon' />
      <View className='games-header' style={headerStyle}>
        <View className='games-heading'>
          <View>
            <Text className='games-eyebrow'>我的房间</Text>
            <Text className='games-title'>所有牌局</Text>
            <Text className='games-lead'>进行中的牌桌和已经结束的战绩，都收在这里。</Text>
          </View>
          <View className='header-tile'><Text>發</Text></View>
        </View>

        <View className='room-summary'>
          <View><Text>{rooms.length}</Text><Text>全部房间</Text></View>
          <View><Text>{activeCount}</Text><Text>进行中</Text></View>
          <View><Text>{endedCount}</Text><Text>已结束</Text></View>
        </View>
      </View>

      <View className='games-content'>
        <View className='filter-tabs'>
          {([
            ['all', '全部'],
            ['active', '进行中'],
            ['ended', '已结束'],
          ] as const).map(([value, label]) => (
            <View className={`filter-tab ${filter === value ? 'is-active' : ''}`} key={value} onClick={() => setFilter(value)}>{label}</View>
          ))}
        </View>

        <View className='games-section-heading'>
          <View><Text className='games-label-bar' /><Text>{filter === 'all' ? '全部牌局' : filter === 'active' ? '进行中的牌局' : '已结束的牌局'}</Text></View>
          <Text>{visibleRooms.length} 个房间</Text>
        </View>

        {loading ? (
          <View className='games-empty'><Text>正在整理牌桌…</Text></View>
        ) : visibleRooms.length === 0 ? (
          <View className='games-empty' onClick={() => filter === 'all' || filter === 'active' ? void openCreate() : undefined}>
            <View className='empty-room-tile'><Text>{filter === 'ended' ? '北' : '東'}</Text></View>
            <View>
              <Text className='games-empty-title'>{filter === 'ended' ? '还没有结束的牌局' : '还没有属于你的牌局'}</Text>
              <Text className='games-empty-note'>{filter === 'ended' ? '结束牌局后，战绩会保存在这里' : '点击中间的加号，创建第一间房'}</Text>
            </View>
          </View>
        ) : (
          <View className='all-room-stack'>
            {visibleRooms.map((room, index) => {
              const score = roomScore(room)
              const recordCount = roomRecords(room.id)
              return (
                <View className={`game-room-card ${room.status === 'ended' ? 'is-ended' : ''}`} key={room.id} onClick={() => void openRoom(room.id)}>
                  <View className={`game-room-tile tile-color-${index % 4}`}><Text>{tileMarks[index % tileMarks.length]}</Text></View>
                  <View className='game-room-copy'>
                    <View className='game-room-title-line'>
                      <Text className='game-room-name'>{room.name}</Text>
                      <Text className={`game-room-score ${score < 0 ? 'is-negative' : ''}`}>{scoreLabel(score)}</Text>
                    </View>
                    <View className='game-room-meta-line'>
                      <Text>{formatRoomDate(room.createdAt)} · {room.players.length}人 · {recordCount}局</Text>
                      <Text className={`room-status status-${room.status}`}>{room.status === 'active' ? '进行中' : '已结束'}</Text>
                    </View>
                  </View>
                  <View className='game-avatar-stack'>
                    {room.players.slice(0, 3).map((player, playerIndex) => (
                      <View className={`game-avatar avatar-${avatarColors[playerIndex % avatarColors.length]}`} key={player.id}><Text>{player.name.slice(0, 1)}</Text></View>
                    ))}
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>

      <View className='bottom-nav'>
        <View className='nav-item' onClick={() => void Taro.redirectTo({ url: '/pages/home/index' })}><View className='nav-icon'>⌂</View><Text>首页</Text></View>
        <View className='nav-item nav-active'><View className='nav-icon'>▱</View><Text>牌局</Text></View>
        <View className='nav-create' onClick={() => void openCreate()}><Text>＋</Text></View>
        <View className='nav-item' onClick={() => void openStats()}><View className='nav-icon'>▥</View><Text>统计</Text></View>
        <View className='nav-item' onClick={() => void showComingSoon('个人中心')}><View className='nav-icon'>♙</View><Text>我的</Text></View>
      </View>
    </View>
  )
}
