import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('WeChat mini program styles', () => {
  it('does not emit unsupported universal selectors or motion media queries into WXSS', () => {
    const styles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/app.css'), 'utf8')

    expect(styles).not.toContain('prefers-reduced-motion')
    expect(styles).not.toMatch(/(^|[,{])\s*\*\s*[{,]/m)
  })

  it('keeps the developer tool pointed at the generated mini program', () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), 'apps/weapp/project.config.json'), 'utf8'))

    expect(config.miniprogramRoot).toBe('dist/')
    expect(config.compileType).toBe('miniprogram')
    expect(config.setting.compileHotReLoad).toBe(false)
  })

  it('keeps the home dashboard structure and custom navigation treatment', () => {
    const appConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/app.config.ts'), 'utf8')
    const page = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/index/index.tsx'), 'utf8')
    const styles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/index/index.css'), 'utf8')
    const pageConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/index/index.config.ts'), 'utf8')

    expect(appConfig).toContain("'pages/home/index'")
    expect(appConfig).not.toContain("'pages/index/index'")
    expect(page).toContain("className='month-card'")
    expect(page).toContain("className='quick-grid'")
    expect(page).toContain("className='bottom-nav'")
    expect(page).not.toContain('最近牌局')
    expect(page).not.toContain('快速记账')
    expect(styles).toContain('.mahjong-tile')
    expect(pageConfig).toContain("navigationStyle: 'custom'")
  })

  it('shows every saved room on the dedicated games page', () => {
    const appConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/app.config.ts'), 'utf8')
    const gamesPage = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/games/index.tsx'), 'utf8')
    const gamesStyles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/games/index.css'), 'utf8')

    expect(appConfig).toContain("'pages/games/index'")
    expect(gamesPage).toContain("scoreboardRepository.listRooms()")
    expect(gamesPage).toContain("['all', '全部']")
    expect(gamesPage).toContain("['active', '进行中']")
    expect(gamesPage).toContain("['ended', '已结束']")
    expect(gamesStyles).toContain('.all-room-stack')
  })

  it('provides a dedicated statistics page and routes every statistics entry to it', () => {
    const appConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/app.config.ts'), 'utf8')
    const homePage = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/index/index.tsx'), 'utf8')
    const gamesPage = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/games/index.tsx'), 'utf8')
    const statsPage = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/stats/index.tsx'), 'utf8')
    const statsStyles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/stats/index.css'), 'utf8')

    expect(appConfig).toContain("'pages/stats/index'")
    expect(homePage).toContain("Taro.redirectTo({ url: '/pages/stats/index' })")
    expect(gamesPage).toContain("Taro.redirectTo({ url: '/pages/stats/index' })")
    expect(statsPage).toContain('calculatePlayerStatistics')
    expect(statsPage).toContain('saveMyPlayerName')
    expect(statsPage).toContain("className='score-detail-list'")
    expect(statsPage).not.toContain('数据复盘')
    expect(statsPage).not.toContain('看看每场输赢')
    expect(statsPage).not.toContain('选择你在牌局中使用的昵称')
    expect(statsPage).not.toContain('只统计有效流水')
    expect(statsPage).not.toContain('结束牌局后会保留完整结果')
    expect(statsStyles).toContain('.pnl-card')
    expect(statsStyles).toContain('.history-card')
  })

  it('keeps create and room pages in the shared mahjong visual system', () => {
    const createPage = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/create/index.tsx'), 'utf8')
    const createStyles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/create/index.css'), 'utf8')
    const createConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/create/index.config.ts'), 'utf8')
    const roomPage = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/room/index.tsx'), 'utf8')
    const roomStyles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/room/index.css'), 'utf8')
    const roomConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/room/index.config.ts'), 'utf8')

    expect(createPage).toContain("className='create-hero'")
    expect(createPage).not.toContain('所有人从 0 分开始')
    expect(createPage).not.toContain('牌局创建后，所有记录只保存在你的小程序中')
    expect(createPage).not.toContain("className='eyebrow'>新牌局")
    expect(createPage).toContain('getMenuButtonBoundingClientRect')
    expect(createPage).toContain("Taro.reLaunch({ url: '/pages/home/index' })")
    expect(createStyles).toContain('.hero-tile')
    expect(roomPage).toContain("className='table-scoreboard'")
    expect(roomPage).not.toContain("className='table-center'")
    expect(roomPage).not.toContain('选赢家，填写每人输赢')
    expect(roomPage).not.toContain('总分始终为 0')
    expect(roomPage).not.toContain('第一局结果会出现在这里')
    expect(roomPage).toContain('getMenuButtonBoundingClientRect')
    expect(roomStyles).toContain('.empty-ledger-tile')
    expect(createConfig).toContain("navigationStyle: 'custom'")
    expect(roomConfig).toContain("navigationStyle: 'custom'")
  })
})
