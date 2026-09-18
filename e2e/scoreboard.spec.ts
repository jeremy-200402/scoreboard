import { expect, test } from '@playwright/test'

test('核心流程保持零和并产生一笔批量流水', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '载入示例牌局' }).click()

  await expect(page.getByRole('heading', { name: '周五麻将局' })).toBeVisible()
  await expect(page.getByText('账目已平')).toBeVisible()
  if (process.env.VISUAL_QA) await page.screenshot({ path: '.tmp/room.png', fullPage: true })

  await page.getByRole('button', { name: /记一笔给分/ }).click()
  await page.getByLabel('给小王的分数').fill('3')
  await page.getByLabel('给小李的分数').fill('2')
  await expect(page.getByText('本次共给出').locator('..').getByText('5')).toBeVisible()
  if (process.env.VISUAL_QA) await page.screenshot({ path: '.tmp/transfer.png' })
  await page.getByRole('button', { name: /确认给分/ }).click()

  await expect(page.getByText('小王 +3 · 小李 +2')).toBeVisible()
  await expect(page.getByText('账目已平')).toBeVisible()

  await page.getByRole('button', { name: '修改' }).first().click()
  await page.getByLabel('给小王的分数').fill('4')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByText('小王 +4 · 小李 +2')).toBeVisible()

  await page.getByRole('button', { name: '撤销' }).first().click()
  await expect(page.getByText('已撤销')).toBeVisible()
  await expect(page.getByText('账目已平')).toBeVisible()
})
