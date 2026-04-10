import { test, expect } from '@playwright/test'

test('clicking Console breadcrumb returns to /_console/', async ({ page }) => {
  await page.goto('/_console/services/ec2')
  const crumb = page.getByRole('link', { name: 'Console' })
  await crumb.click()
  await expect(page).toHaveURL(/\/_console\/?$/)
})
