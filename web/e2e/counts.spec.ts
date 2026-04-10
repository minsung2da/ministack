import { test, expect } from '@playwright/test'

test.describe('Service home resource counts (NAV-04 E2E)', () => {
  test('DynamoDB service home renders a numeric count from real ListTables', async ({ page }) => {
    await page.goto('/_console/services/dynamodb')
    await expect(page.getByText(/^\d+\s+tables$/)).toBeVisible({ timeout: 10_000 })
  })

  test('Lambda service home renders a numeric function count', async ({ page }) => {
    await page.goto('/_console/services/lambda')
    await expect(page.getByText(/^\d+\s+functions$/)).toBeVisible({ timeout: 10_000 })
  })

  test('S3 service home shows the "not available in Phase 1" message', async ({ page }) => {
    await page.goto('/_console/services/s3')
    await expect(page.getByText(/not available in Phase 1/i)).toBeVisible({ timeout: 10_000 })
  })
})
