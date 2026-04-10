import { test, expect } from '@playwright/test'

test.describe('Console navigation end-to-end', () => {
  test('opens /_console/ and renders the app shell', async ({ page }) => {
    await page.goto('/_console/')
    // TopBar brand — Cloudscape TopNavigation renders the title in a responsive
    // container that may hide the text span at narrow defaults. Assert the element
    // exists in the DOM (attached) rather than requiring pixel-visibility.
    await expect(page.locator('[class*="awsui_title"]').first()).toBeAttached()
    // Sidebar header
    await expect(page.getByText('Services', { exact: true }).first()).toBeVisible()
    // Breadcrumb root
    await expect(page.getByText('Console', { exact: true }).first()).toBeVisible()
  })

  test('deep link /services/dynamodb renders without a reload', async ({ page }) => {
    await page.goto('/_console/')
    await page.goto('/_console/services/dynamodb')
    await expect(page.getByRole('heading', { name: /DynamoDB/i })).toBeVisible({ timeout: 10_000 })
  })

  test('SPA fallback: hard-refresh a deep link returns the app', async ({ page }) => {
    await page.goto('/_console/services/ec2')
    await page.reload()
    await expect(page.getByRole('heading', { name: /EC2/i })).toBeVisible({ timeout: 10_000 })
  })
})
