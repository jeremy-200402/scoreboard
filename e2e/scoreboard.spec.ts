import { expect, test } from '@playwright/test'

test('选择赢家、自动补齐最后一位输家并保持零和', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /创建新牌局/ }).click()
  await page.getByRole('button', { name: /创建并开始/ }).click()

  await expect(page.getByRole('heading', { name: '小张的牌局' })).toBeVisible()
  await expect(page.getByText('账目已平')).toBeVisible()
  if (process.env.VISUAL_QA) await page.screenshot({ path: '.tmp/room.png', fullPage: true })

  await page.getByRole('button', { name: /记录本局/ }).click()
  await page.getByRole('radio', { name: '小李' }).click()
  await page.getByLabel('小李赢的分数').fill('10')
  await page.getByLabel('小张支出的分数').fill('2')
  await page.getByLabel('小王支出的分数').fill('6')
  await expect(page.getByLabel('校长支出的分数')).toHaveValue('2')
  await expect(page.getByText('本局已算平')).toBeVisible()
  await expect(page.getByRole('button', { name: /确认本局/ })).toBeEnabled()
  if (process.env.VISUAL_QA) await page.screenshot({ path: '.tmp/transfer.png' })
  await page.getByRole('button', { name: /确认本局/ }).click()

  await expect(page.getByText('小张 −2 · 小王 −6 · 校长 −2')).toBeVisible()
  await expect(page.getByText('账目已平')).toBeVisible()

  await page.getByRole('button', { name: '修改' }).first().click()
  await page.getByLabel('小张支出的分数').fill('3')
  await expect(page.getByLabel('校长支出的分数')).toHaveValue('1')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByText('小张 −3 · 小王 −6 · 校长 −1')).toBeVisible()

  await page.getByRole('button', { name: '撤销' }).first().click()
  await expect(page.getByText('已撤销')).toBeVisible()
  await expect(page.getByText('账目已平')).toBeVisible()
})
