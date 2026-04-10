import { test, expect } from '@playwright/test'

test('no horizontal scroll at 1366x768 (NAV-05)', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/_console/')
  await page.waitForLoadState('networkidle')
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalScroll).toBe(false)
})
