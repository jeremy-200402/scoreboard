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
})
