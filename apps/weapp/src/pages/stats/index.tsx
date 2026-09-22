import { useMemo, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import type { Room, WinnerOperation } from '../../domain/models'
import { scoreLabel } from '../../domain/score'
import { calculatePlayerStatistics, listPlayerNames } from '../../domain/statistics'
import { scoreboardRepository } from '../../infrastructure/storage'
import './index.css'

type HistoryFilter = 'all' | 'ended'

const formatRoomDate = (value: string) => {
  const date = new Date(value)
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}

export default function StatsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [operations, setOperations] = useState<WinnerOperation[]>([])
  const [selectedName, setSelectedName] = useState('')
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [loading, setLoading] = useState(true)
  const menuButton = Taro.getMenuButtonBoundingClientRect()
  const headerStyle = { paddingTop: `${menuButton.bottom + 12}px` }

  useDidShow(() => {
    void Promise.all([
      scoreboardRepository.listRooms(),
      scoreboardRepository.listOperations(),
      scoreboardRepository.getMyPlayerName(),
    ]).then(([nextRooms, nextOperations, savedName]) => {
      const names = listPlayerNames(nextRooms)
      setRooms(nextRooms)
      setOperations(nextOperations)
      setSelectedName(names.includes(savedName) ? savedName : (names[0] ?? ''))
      setLoading(false)
    })
  })

  const playerNames = useMemo(() => listPlayerNames(rooms), [rooms])
  const statistics = useMemo(
    () => calculatePlayerStatistics(rooms, operations, selectedName),
    [operations, rooms, selectedName],
  )
  const visibleHistory = filter === 'ended'
    ? statistics.history.filter((item) => item.room.status === 'ended')
    : statistics.history

  const choosePlayer = (playerName: string) => {
    setSelectedName(playerName)
    void scoreboardRepository.saveMyPlayerName(playerName)
  }

  const openRoom = (roomId: string) => Taro.navigateTo({ url: `/pages/room/index?roomId=${roomId}` })
  const openCreate = () => Taro.navigateTo({ url: '/pages/create/index' })
  const showComingSoon = () => Taro.showToast({ title: '个人中心正在准备中', icon: 'none' })

  return (
    <View className='stats-shell'>
      <View className='stats-ribbon' />
      <View className='stats-header' style={headerStyle}>
        <View className='stats-heading'>
          <Text className='stats-title'>战绩统计</Text>
        </View>
      </View>

      <View className='stats-content'>
        {loading ? (
          <View className='stats-empty'><Text>正在翻阅战绩…</Text></View>
        ) : playerNames.length === 0 ? (
          <View className='stats-empty stats-empty-action' onClick={() => void openCreate()}>
            <View className='stats-empty-tile'><Text>東</Text></View>
            <Text className='stats-empty-title'>还没有可以统计的牌局</Text>
          </View>
        ) : (
          <>
            <View className='identity-card'>
              <View className='identity-heading'><Text>我是谁</Text></View>
              <View className='identity-list'>
                {playerNames.map((playerName) => (
                  <View
                    className={`identity-chip ${selectedName === playerName ? 'is-selected' : ''}`}
                    key={playerName}
                    onClick={() => choosePlayer(playerName)}
                  >
                    <Text>{playerName.slice(0, 1)}</Text><Text>{playerName}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className={`pnl-card ${statistics.totalScore < 0 ? 'is-negative' : ''}`}>
              <View className='pnl-decoration'><Text>中</Text></View>
              <Text className='pnl-label'>{selectedName}的总盈亏</Text>
              <View className='pnl-value'><Text>{scoreLabel(statistics.totalScore)}</Text><Text>分</Text></View>
            </View>

            <View className='stats-metrics'>
              <View><Text>{statistics.roomCount}</Text><Text>参与牌局</Text></View>
              <View><Text>{statistics.roundCount}</Text><Text>累计记录</Text></View>
              <View><Text>{statistics.winningRoomCount}</Text><Text>盈利场次</Text></View>
              <View><Text>{scoreLabel(statistics.bestRoomScore)}</Text><Text>单场最佳</Text></View>
            </View>

            <View className='history-title-row'>
              <View><Text className='history-title-bar' /><Text>过往战绩</Text></View>
              <View className='history-filters'>
                <Text className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>全部</Text>
                <Text className={filter === 'ended' ? 'is-active' : ''} onClick={() => setFilter('ended')}>已结束</Text>
              </View>
            </View>

            {visibleHistory.length === 0 ? (
              <View className='history-empty'><Text>还没有已结束的战绩</Text></View>
            ) : (
              <View className='history-list'>
                {visibleHistory.map((item, index) => (
                  <View className='history-card' key={item.room.id} onClick={() => void openRoom(item.room.id)}>
                    <View className='history-card-head'>
                      <View className={`history-tile history-tile-${index % 4}`}><Text>{['東', '南', '西', '北'][index % 4]}</Text></View>
                      <View className='history-card-copy'>
                        <View className='history-name-line'><Text>{item.room.name}</Text><Text className={item.myScore < 0 ? 'is-negative' : ''}>{scoreLabel(item.myScore)}</Text></View>
                        <Text className='history-meta'>{formatRoomDate(item.room.createdAt)} · {item.recordCount} 局 · 第 {item.myRank} 名</Text>
                      </View>
                      <Text className={`history-status status-${item.room.status}`}>{item.room.status === 'ended' ? '已结束' : '进行中'}</Text>
                    </View>
                    <View className='score-detail-list'>
                      {item.scores.map((player, playerIndex) => (
                        <View className={player.name === selectedName ? 'is-me' : ''} key={player.id}>
                          <Text>{playerIndex + 1}</Text><Text>{player.name}</Text><Text className={player.score < 0 ? 'is-negative' : ''}>{scoreLabel(player.score)}</Text>
                        </View>
                      ))}
                    </View>
                    <View className='history-card-foot'><Text>查看完整流水</Text><Text>→</Text></View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View className='bottom-nav'>
        <View className='nav-item' onClick={() => void Taro.redirectTo({ url: '/pages/home/index' })}><View className='nav-icon'>⌂</View><Text>首页</Text></View>
        <View className='nav-item' onClick={() => void Taro.redirectTo({ url: '/pages/games/index' })}><View className='nav-icon'>▱</View><Text>牌局</Text></View>
        <View className='nav-create' onClick={() => void openCreate()}><Text>＋</Text></View>
        <View className='nav-item nav-active'><View className='nav-icon'>▥</View><Text>统计</Text></View>
        <View className='nav-item' onClick={() => void showComingSoon()}><View className='nav-icon'>♙</View><Text>我的</Text></View>
      </View>
    </View>
  )
}
