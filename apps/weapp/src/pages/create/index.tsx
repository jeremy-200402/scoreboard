import { useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { Room } from '../../domain/models'
import { scoreboardRepository } from '../../infrastructure/storage'
import { makeId, now } from '../../utils'
import './index.css'

export default function CreateRoomPage() {
  const [roomName, setRoomName] = useState('')
  const [players, setPlayers] = useState(['小张', '小王', '小李', '校长'])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const menuButton = Taro.getMenuButtonBoundingClientRect()
  const navigationStyle = { paddingTop: `${menuButton.top}px`, height: `${menuButton.bottom + 8}px` }

  const goBack = () => Taro.getCurrentPages().length > 1
    ? Taro.navigateBack()
    : Taro.reLaunch({ url: '/pages/home/index' })

  const updatePlayer = (index: number, value: string) => {
    setPlayers((items) => items.map((item, itemIndex) => itemIndex === index ? value : item))
    setError('')
  }

  const createRoom = async () => {
    const names = players.map((item) => item.trim()).filter(Boolean)
    if (names.length < 2 || names.length > 8) {
      setError('牌局需要 2 至 8 名玩家')
      return
    }
    if (new Set(names).size !== names.length) {
      setError('玩家昵称不能重复')
      return
    }

    setSaving(true)
    const roomId = makeId()
    const room: Room = {
      id: roomId,
      name: roomName.trim() || `${names[0]}的牌局`,
      status: 'active',
      createdAt: now(),
      players: names.map((name) => ({ id: makeId(), roomId, name, initialScore: 0 })),
    }

    try {
      await scoreboardRepository.saveRoom(room)
      await Taro.redirectTo({ url: `/pages/room/index?roomId=${room.id}` })
    } catch {
      setSaving(false)
      setError('保存失败，请检查小程序存储权限后重试')
    }
  }

  return (
    <View className='create-shell'>
      <View className='subpage-ribbon' />
      <View className='subpage-nav' style={navigationStyle}>
        <View className='back-button' onClick={() => void goBack()}><Text>‹</Text></View>
        <Text className='subpage-nav-title'>创建牌局</Text>
        <View className='nav-placeholder' />
      </View>

      <View className='page create-page'>
        <View className='create-hero'>
          <View className='hero-tile'><Text>東</Text></View>
          <View className='hero-copy'>
            <Text className='eyebrow'>新牌局</Text>
            <Text className='page-title'>谁上桌？</Text>
            <Text className='page-lead'>所有人从 0 分开始，每局选出赢家，系统自动核对输赢。</Text>
          </View>
        </View>

        <View className='field'>
          <Text className='field-label'>牌局名称 <Text className='optional'>可选</Text></Text>
          <Input
            className='text-input'
            value={roomName}
            maxlength={24}
            placeholder='例如：周五麻将局'
            onInput={(event) => setRoomName(event.detail.value)}
          />
        </View>

        <View className='field-group'>
          <View className='field-heading'>
            <Text>玩家</Text><Text className='optional'>{players.length}/8</Text>
          </View>
          <View className='player-list'>
            {players.map((player, index) => (
              <View className='player-row' key={`${index}-${players.length}`}>
                <Text className={`seat-number seat-${index % 4}`}>{['東', '南', '西', '北', '五', '六', '七', '八'][index]}</Text>
                <Input
                  className='player-input'
                  value={player}
                  maxlength={10}
                  placeholder={`玩家 ${index + 1}`}
                  onInput={(event) => updatePlayer(index, event.detail.value)}
                />
                {players.length > 2 && (
                  <Text className='remove-player' onClick={() => setPlayers((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</Text>
                )}
              </View>
            ))}
          </View>
          {players.length < 8 && (
            <Text className='add-player' onClick={() => setPlayers((items) => [...items, ''])}>＋ 添加玩家</Text>
          )}
        </View>

        {error && <Text className='form-error'>{error}</Text>}
        <View className={`primary-button ${saving ? 'is-disabled' : ''}`} onClick={() => !saving && void createRoom()}>
          <Text>{saving ? '正在创建…' : '创建并开始'}</Text><Text className='button-arrow'>→</Text>
        </View>
        <Text className='create-hint'>牌局创建后，所有记录只保存在你的小程序中</Text>
      </View>
    </View>
  )
}
