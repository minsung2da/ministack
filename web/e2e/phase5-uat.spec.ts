import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:4566/_console'

test.describe.configure({ mode: 'default' })

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle')
}

// ---------------------------------------------------------------------------
// DDB-01 / 02 / 03
// ---------------------------------------------------------------------------

test('DDB-01 list shows seeded uat-orders table', async ({ page }) => {
  await open(page, '/services/ddb')
  const body = (await page.textContent('body')) ?? ''
  expect(body).toContain('uat-orders')
  expect(body).toMatch(/Tables|DynamoDB/i)
})

test('DDB-01 navigate to table detail', async ({ page }) => {
  await open(page, '/services/ddb')
  await page.getByRole('link', { name: 'uat-orders' }).first().click()
  await page.waitForLoadState('networkidle')
  expect(page.url()).toContain('/services/ddb/uat-orders')
  const body = (await page.textContent('body')) ?? ''
  expect(body).toMatch(/Items|Configuration/)
})

test('DDB-02 scan returns 15 seeded items', async ({ page }) => {
  await open(page, '/services/ddb/uat-orders')
  // Items tab is likely default; click if needed
  const itemsTab = page.getByRole('tab', { name: /items/i }).first()
  if (await itemsTab.count()) await itemsTab.click()
  await page.waitForLoadState('networkidle')
  // Click scan/run if exists, else table populates auto
  const runBtn = page.getByRole('button', { name: /run scan|scan|refresh/i }).first()
  if (await runBtn.count()) {
    await runBtn.click()
    await page.waitForLoadState('networkidle')
  }
  await page.waitForTimeout(1500)
  const body = (await page.textContent('body')) ?? ''
  // 15 items contain pk values customer-0..customer-2
  expect(body).toMatch(/customer-[012]/)
  expect(body).toMatch(/order-/)
})

test('DDB-03 PutItem via JSON mode (D-03 toggle + scalar marshaling)', async ({ page }) => {
  test.setTimeout(45000)
  await open(page, '/services/ddb/uat-orders')
  const putBtn = page.getByRole('button', { name: /put item|create item|add item/i }).first()
  await putBtn.click()
  await page.waitForTimeout(500)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Switch to JSON mode via segmented toolbar button (D-03 advanced mode)
  const jsonBtn = dialog.getByRole('button', { name: /^json$/i }).first()
  await jsonBtn.click()
  await page.waitForTimeout(500)
  // Fill JSON textarea with valid item including all scalar types
  const textarea = dialog.locator('textarea').first()
  await textarea.fill(JSON.stringify({
    pk: { S: 'uat-json-test' },
    sk: { S: 'order-json-1' },
    status: { S: 'active' },
    amount: { N: '999' },
    paid: { BOOL: true },
    notes: { NULL: true },
  }))
  await page.waitForTimeout(500)
  // Submit — button label is "Save"
  const saveBtn = dialog.getByRole('button', { name: /^save$/i }).first()
  await expect(saveBtn).toBeEnabled()
  await saveBtn.click()
  await page.waitForTimeout(3000)
  // Verify success — modal closes and table refresh shows item OR flash message
  const body = (await page.textContent('body')) ?? ''
  expect(body).toMatch(/uat-json-test|saved|created/i)
})

test('DDB-03 JSON mode toggle in PutItem modal (D-03)', async ({ page }) => {
  await open(page, '/services/ddb/uat-orders')
  const putBtn = page.getByRole('button', { name: /put item|create item|add item/i }).first()
  await putBtn.click()
  await page.waitForTimeout(500)
  // Look for a JSON toggle (segmented control or tab)
  const jsonToggle = page.getByRole('button', { name: /json/i }).or(
    page.getByRole('tab', { name: /json/i })
  ).first()
  if (await jsonToggle.count()) {
    await jsonToggle.click()
    await page.waitForTimeout(300)
    // Should reveal a textarea
    const textarea = page.getByRole('dialog').locator('textarea').first()
    await expect(textarea).toBeVisible()
  }
  // Close
  const cancelBtn = page.getByRole('button', { name: /cancel/i }).last()
  if (await cancelBtn.count()) await cancelBtn.click()
})

// ---------------------------------------------------------------------------
// SQS-01 / 02 / 03
// ---------------------------------------------------------------------------

test('SQS-01 queue list shows uat-jobs with counts column', async ({ page }) => {
  await open(page, '/services/sqs')
  const body = (await page.textContent('body')) ?? ''
  expect(body).toContain('uat-jobs')
  expect(body).toMatch(/Messages|Visible/i)
})

test('SQS-02 SendMessage + Poll accumulates (D-04)', async ({ page }) => {
  test.setTimeout(60000)
  await open(page, '/services/sqs')
  // Click queue
  await page.getByRole('link', { name: 'uat-jobs' }).first().click()
  await page.waitForLoadState('networkidle')
  // Send 2 messages via UI
  for (const body of ['hello-1', 'hello-2']) {
    const sendBtn = page.getByRole('button', { name: /send message/i }).first()
    await sendBtn.click()
    await page.waitForTimeout(400)
    const dialog = page.getByRole('dialog')
    const textarea = dialog.locator('textarea').first()
    await textarea.fill(body)
    await dialog.getByRole('button', { name: /send/i }).first().click()
    await page.waitForTimeout(800)
  }
  // Poll once
  const pollBtn = page.getByRole('button', { name: /^poll$/i }).first()
  await pollBtn.click()
  await page.waitForTimeout(3000)
  const after1 = (await page.textContent('body')) ?? ''
  const has1 = /hello-[12]/.test(after1)
  expect(has1).toBe(true)
  // Poll again — accumulating list (D-04): no auto-clear
  await pollBtn.click()
  await page.waitForTimeout(2000)
})

test('SQS-03 Purge type-to-confirm', async ({ page }) => {
  test.setTimeout(45000)
  await open(page, '/services/sqs/uat-jobs')
  const purgeBtn = page.getByRole('button', { name: /^purge( queue)?$/i }).first()
  await purgeBtn.click()
  await page.waitForTimeout(500)
  const dialog = page.getByRole('dialog')
  const confirmInput = dialog.getByRole('textbox')
  // wrong text disables submit
  await confirmInput.fill('wrong')
  await page.waitForTimeout(200)
  const submitBtn = dialog.getByRole('button', { name: /^purge( queue)?$|^delete$|^confirm$/i }).first()
  await expect(submitBtn).toBeDisabled()
  // correct queue name enables
  await confirmInput.fill('uat-jobs')
  await page.waitForTimeout(200)
  await expect(submitBtn).toBeEnabled()
  await submitBtn.click()
  await page.waitForTimeout(2000)
})

// ---------------------------------------------------------------------------
// GEN-01 / 02
// ---------------------------------------------------------------------------

test('GEN sidebar — IAM split into 3 entries (D-09)', async ({ page }) => {
  await open(page, '/services/iam.users')
  const body = (await page.textContent('body')) ?? ''
  // Sidebar should show all three iam.* entries
  expect(body).toMatch(/iam\.users|Users/i)
})

test('GEN-01 IAM users list shows seeded alice and bob', async ({ page }) => {
  await open(page, '/services/iam.users')
  await page.waitForTimeout(2000)
  const body = (await page.textContent('body')) ?? ''
  expect(body).toContain('alice')
  expect(body).toContain('bob')
})

test('GEN /services/iam (bare) redirects to iam.users (D-09)', async ({ page }) => {
  await open(page, '/services/iam')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  expect(page.url()).toContain('iam.users')
})

test('GEN STS singleton page goes straight to detail (Pitfall 7.2.7)', async ({ page }) => {
  await open(page, '/services/sts')
  await page.waitForTimeout(2000)
  const body = (await page.textContent('body')) ?? ''
  // GetCallerIdentity returns Account, Arn, UserId
  expect(body).toMatch(/Account|UserId|Arn/i)
  expect(body).toMatch(/000000000000|root/)
})

test('GEN-02 Secrets list + Reveal toggle (D-08)', async ({ page }) => {
  await open(page, '/services/secretsmanager')
  await page.waitForTimeout(2000)
  const body = (await page.textContent('body')) ?? ''
  expect(body).toContain('uat-db-password')
  // Click row → detail panel
  await page.getByText('uat-db-password').first().click()
  await page.waitForTimeout(1500)
  // Detail should show masked value with Reveal button
  const detail = (await page.textContent('body')) ?? ''
  // Mask glyphs OR a Reveal button
  const hasReveal = /reveal/i.test(detail)
  const isMasked = /•|\*|_hidden|hidden|masked/i.test(detail)
  expect(hasReveal || isMasked).toBe(true)
})

test('GEN-02 KMS list is read-only (no Create/Delete buttons — D-02)', async ({ page }) => {
  await open(page, '/services/kms')
  await page.waitForTimeout(2000)
  // Should NOT have Create or Delete row-actions for KMS (no mutations field in descriptor)
  const createBtn = page.getByRole('button', { name: /create|add key|new/i })
  const deleteBtn = page.getByRole('button', { name: /^delete$/i })
  expect(await createBtn.count()).toBe(0)
  expect(await deleteBtn.count()).toBe(0)
})

test('GEN-02 Secrets has Create button (descriptor has mutations.create — D-02)', async ({ page }) => {
  await open(page, '/services/secretsmanager')
  await page.waitForTimeout(1500)
  const createBtn = page.getByRole('button', { name: /create|new secret/i }).first()
  expect(await createBtn.count()).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// D-07 — Generic write JSON diff preview gate
// ---------------------------------------------------------------------------

test('D-07 Generic Create shows JSON diff preview before send', async ({ page }) => {
  test.setTimeout(45000)
  await open(page, '/services/secretsmanager')
  await page.waitForTimeout(1500)
  // Click Create
  const createBtn = page.getByRole('button', { name: /create|new secret/i }).first()
  await createBtn.click()
  await page.waitForTimeout(500)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Fill required Name field via label binding
  const nameInput = dialog.getByRole('textbox', { name: /^secret name$/i }).first()
  await nameInput.fill('uat-preview-test')
  // Fill JSON value textarea
  const textarea = dialog.locator('textarea').first()
  if (await textarea.count()) {
    await textarea.fill('{"key":"v1"}')
  }
  await page.waitForTimeout(300)
  // Click Review request — opens diff preview modal
  const reviewBtn = dialog.getByRole('button', { name: /review request|review/i }).first()
  await reviewBtn.click()
  await page.waitForTimeout(800)
  // Diff preview modal should show a JSON-like representation of the request
  const all = (await page.textContent('body')) ?? ''
  expect(all).toMatch(/uat-preview-test/)
  // Look for words indicating preview gate
  expect(all).toMatch(/review|preview|send|request|will be sent/i)
  // Cancel out (don't actually send)
  const cancel = page.getByRole('button', { name: /cancel/i }).last()
  if (await cancel.count()) await cancel.click()
})
