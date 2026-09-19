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
  })

  it('keeps the home dashboard structure and custom navigation treatment', () => {
    const page = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/index/index.tsx'), 'utf8')
    const styles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/index/index.css'), 'utf8')
    const pageConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/index/index.config.ts'), 'utf8')

    expect(page).toContain("className='month-card'")
    expect(page).toContain("className='quick-grid'")
    expect(page).toContain("className='bottom-nav'")
    expect(styles).toContain('.mahjong-tile')
    expect(pageConfig).toContain("navigationStyle: 'custom'")
  })

  it('keeps create and room pages in the shared mahjong visual system', () => {
    const createPage = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/create/index.tsx'), 'utf8')
    const createStyles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/create/index.css'), 'utf8')
    const createConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/create/index.config.ts'), 'utf8')
    const roomPage = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/room/index.tsx'), 'utf8')
    const roomStyles = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/room/index.css'), 'utf8')
    const roomConfig = readFileSync(resolve(process.cwd(), 'apps/weapp/src/pages/room/index.config.ts'), 'utf8')

    expect(createPage).toContain("className='create-hero'")
    expect(createPage).toContain('getMenuButtonBoundingClientRect')
    expect(createPage).toContain("Taro.reLaunch({ url: '/pages/index/index' })")
    expect(createStyles).toContain('.hero-tile')
    expect(roomPage).toContain("className='table-scoreboard'")
    expect(roomPage).toContain('getMenuButtonBoundingClientRect')
    expect(roomStyles).toContain('.empty-ledger-tile')
    expect(createConfig).toContain("navigationStyle: 'custom'")
    expect(roomConfig).toContain("navigationStyle: 'custom'")
  })
})
