import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5173'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

async function switchRole(label) {
  await page.getByRole('button', { name: label, exact: true }).click()
  await page.waitForTimeout(1200)
  const err = page.locator('.dev-role-switcher__error')
  if (await err.isVisible()) {
    throw new Error(await err.textContent())
  }
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  if (await page.locator('.account-sidebar').isVisible()) {
    throw new Error('Sidebar must not appear on landing')
  }

  await switchRole('Покупатель')
  await page.goto(`${BASE}/seller`, { waitUntil: 'networkidle' })
  await page.locator('.account-sidebar').waitFor({ state: 'visible' })
  await page.locator('.account-sidebar').getByRole('link', { name: 'Корзина' }).click()
  await page.waitForURL('**/cart')
  await page.getByRole('heading', { name: 'Корзина' }).waitFor()

  await switchRole('Продавец')
  await page.goto(`${BASE}/seller`, { waitUntil: 'networkidle' })
  await page.locator('.account-sidebar').getByRole('link', { name: 'Моя витрина' }).click()
  await page.waitForURL('**/sellers/**')
  await page.locator('.seller-header').waitFor()

  await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Товары' }).waitFor()
  const cards = page.locator('.product-card')
  const count = await cards.count()
  if (count < 1) throw new Error('Catalog has no product cards')

  const firstCart = page.locator('.btn-icon-cart').first()
  if (await firstCart.isVisible()) {
    await firstCart.click()
    await page.waitForTimeout(500)
  }

  await page.goto(`${BASE}/services`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Мастер-классы' }).waitFor()

  console.log('OK: role switch, cart, showcase, catalog, services')
} catch (e) {
  console.error('FAIL:', e.message)
  await page.screenshot({ path: '/tmp/craftsphere-fail.png' })
  process.exit(1)
} finally {
  await browser.close()
}
