import { test, expect } from '@playwright/test'

test('sidebar still reachable at narrow laptop width (NAV-05)', async ({ page }) => {
  // Below 720px main-content min, Cloudscape auto-collapses the sidebar.
  // We verify the shell does not crash and the brand/sidebar toggle are reachable.
  await page.setViewportSize({ width: 900, height: 720 })
  await page.goto('/_console/')
  await expect(page.getByText('MiniStack', { exact: true }).first()).toBeVisible()
  // Sidebar toggle button exists (Cloudscape AppLayout renders it regardless of state)
  const toggle = page.getByRole('button', { name: /navigation/i }).first()
  await expect(toggle).toBeVisible()
})
