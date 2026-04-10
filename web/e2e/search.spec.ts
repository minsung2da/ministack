import { test, expect } from '@playwright/test'

test('typing "dyn" finds DynamoDB and navigates on select', async ({ page }) => {
  await page.goto('/_console/')
  // Cloudscape Autosuggest renders duplicate inputs — target the visible combobox
  const search = page.getByRole('combobox', { name: 'Search services' })
  await search.click()
  await search.fill('dyn')
  const option = page.getByRole('option', { name: /DynamoDB/i })
  await expect(option).toBeVisible()
  await option.click()
  await expect(page).toHaveURL(/\/services\/dynamodb$/)
})
