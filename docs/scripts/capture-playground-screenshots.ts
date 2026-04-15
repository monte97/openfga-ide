/**
 * Captures screenshots from play.fga.dev for the montelli.dev OpenFGA article series.
 * Usage (from openfga-viewer project root):
 *   npx tsx docs/scripts/capture-playground-screenshots.ts
 *
 * Output: docs/assets/playground-screenshots/
 *   - model-dsl.png   (DSL + graph)
 *   - tuples.png      (tuples populated)
 *   - check-alice-lesson.png  (allowed, with ACL trace)
 *   - check-capability.png    (denied, with ACL trace)
 */

import { chromium, Browser, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = process.cwd()
const SHOTS_DIR = path.resolve(PROJECT_ROOT, process.env.SHOTS_DIR ?? 'docs/assets/playground-screenshots')
const FIXTURE_FILE = path.resolve(PROJECT_ROOT, process.env.FIXTURE_FILE ?? 'demo/demo-elearning.json')
const SKIP_CHECKS = process.env.SKIP_CHECKS === '1'
const CHECK_ALLOWED = process.env.CHECK_ALLOWED ?? 'is user:alice related to lesson:l1 as can_edit'
const CHECK_DENIED = process.env.CHECK_DENIED ?? 'is user:bob related to system:main as can_manage_users'
const VIEWPORT = { width: 1440, height: 900 }

type Tuple = { user: string; relation: string; object: string }
type Fixture = { storeName: string; dsl: string; tuples: Tuple[] }

async function dismissOverlays(page: Page): Promise<void> {
  try { await page.getByRole('button', { name: /required only/i }).click({ timeout: 3000 }) } catch {}
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(400)
    const btn = page.getByRole('button', { name: /^(skip|get started|next)$/i }).first()
    if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {})
    else break
  }
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(SHOTS_DIR, name), animations: 'disabled' })
  console.log(`  ok ${name}`)
}

async function spreadGraph(page: Page): Promise<void> {
  // Passed as string to avoid tsx compiling named arrows with __name() calls
  // that don't exist in the browser context.
  const result = await page.evaluate(`(function() {
    const isNet = function(v) { return v && typeof v === 'object' && v.body && v.body.nodes && typeof v.fit === 'function' }
    const all = document.querySelectorAll('*')
    const visit = new Set()
    let network = null
    const tryNode = function(n) {
      if (!n || visit.has(n) || network) return
      visit.add(n)
      const sn = n.stateNode
      if (sn && typeof sn === 'object') {
        if (isNet(sn)) { network = sn; return }
        if (sn.refs) for (const rk of Object.keys(sn.refs)) {
          if (isNet(sn.refs[rk])) { network = sn.refs[rk]; return }
        }
        for (const pk of Object.keys(sn)) {
          if (isNet(sn[pk])) { network = sn[pk]; return }
        }
      }
    }
    all.forEach(function(el) {
      if (network) return
      for (const key of Object.keys(el)) {
        if (key.indexOf('__reactFiber') !== 0 && key.indexOf('__reactInternalInstance') !== 0) continue
        const stack = [el[key]]
        let steps = 0
        while (stack.length && steps < 500 && !network) {
          steps++
          const f = stack.pop()
          if (!f) continue
          tryNode(f)
          if (f.child) stack.push(f.child)
          if (f.sibling) stack.push(f.sibling)
        }
        break
      }
    })
    if (!network) return Promise.resolve('no-network')
    return new Promise(function(resolve) {
      try {
        const nodeCount = Object.keys(network.body.nodes).length
        const opts = nodeCount <= 15
          ? {
              layout: {
                hierarchical: {
                  enabled: true,
                  direction: 'UD',
                  sortMethod: 'directed',
                  nodeSpacing: 180,
                  levelSeparation: 140,
                  treeSpacing: 200,
                  blockShifting: true,
                  edgeMinimization: true,
                  parentCentralization: true,
                },
              },
              physics: {
                enabled: true,
                solver: 'hierarchicalRepulsion',
                hierarchicalRepulsion: {
                  nodeDistance: 180,
                  centralGravity: 0.0,
                  springLength: 140,
                  springConstant: 0.01,
                  damping: 0.5,
                  avoidOverlap: 1,
                },
                stabilization: { iterations: 1000, fit: true, updateInterval: 100 },
              },
            }
          : {
              layout: {
                hierarchical: {
                  enabled: true,
                  direction: 'LR',
                  sortMethod: 'directed',
                  nodeSpacing: 90,
                  levelSeparation: 280,
                  treeSpacing: 120,
                  blockShifting: true,
                  edgeMinimization: true,
                  parentCentralization: false,
                },
              },
              physics: {
                enabled: true,
                solver: 'hierarchicalRepulsion',
                hierarchicalRepulsion: {
                  nodeDistance: 100,
                  centralGravity: 0.0,
                  springLength: 180,
                  springConstant: 0.005,
                  damping: 0.6,
                  avoidOverlap: 1,
                },
                stabilization: { iterations: 1500, fit: true, updateInterval: 100 },
              },
            }
        network.setOptions(opts)
        let done = false
        const finish = function() {
          if (done) return; done = true
          try {
            network.fit({ animation: false })
            resolve('ok')
          } catch (e) { resolve('err-fit:' + e.message) }
        }
        network.once('stabilizationIterationsDone', finish)
        network.stabilize(nodeCount <= 15 ? 1000 : 2000)
        setTimeout(finish, 10000)
      } catch (e) {
        resolve('err:' + (e && e.message ? e.message : 'unknown'))
      }
    })
  })()`)
  console.log(`  spreadGraph: ${result}`)

  if (result === 'ok') {
    await page.waitForTimeout(2500)
  } else {
    const canvas = page.locator('.vis-network canvas').first()
    const box = await canvas.boundingBox()
    if (box) {
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      await page.mouse.move(cx, cy)
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -150)
        await page.waitForTimeout(120)
      }
      console.log('  spreadGraph: wheel-zoom fallback applied')
    }
    await page.waitForTimeout(1000)
  }
}

async function runQuery(page: Page, query: string): Promise<void> {
  const queryInput = page.locator('input[type="text"]:visible').last()
  await queryInput.click()
  await queryInput.fill('')
  await page.keyboard.type(query, { delay: 40 })
  await page.waitForTimeout(1200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2500)
}

async function main(): Promise<void> {
  fs.mkdirSync(SHOTS_DIR, { recursive: true })
  const fixture = JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf-8')) as Fixture

  console.log('[playground] Launching browser...')
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  const page: Page = await context.newPage()

  try {
    console.log('[playground] Opening play.fga.dev...')
    await page.goto('https://play.fga.dev/', { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(2000)
    await dismissOverlays(page)

    console.log('[playground] Creating new store...')
    await page.locator('button.MuiButton-contained[aria-label="New Store"]').click()
    await page.waitForTimeout(700)
    await page.locator('input[placeholder*="Store name"]').fill('elearning')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(3500)

    console.log('[playground] Pasting DSL into Monaco...')
    await page.locator('.monaco-editor').first().click()
    await page.evaluate((text) => {
      // @ts-ignore
      const ed = (window as any).monaco.editor.getEditors()[0]
      const full = ed.getModel().getFullModelRange()
      ed.executeEdits('insert', [{ range: full, text }])
    }, fixture.dsl)
    await page.waitForTimeout(1500)

    console.log('[playground] Saving model...')
    await page.getByRole('button', { name: /^save$/i }).click()
    await page.waitForTimeout(5000)
    await spreadGraph(page)
    await shot(page, 'model-dsl.png')

    console.log('[playground] Adding tuples...')
    await page.getByRole('button', { name: /^add tuple$/i }).click()
    await page.waitForTimeout(500)
    for (let i = 0; i < fixture.tuples.length; i++) {
      const t = fixture.tuples[i]
      const inputs = page.locator('input[type="text"]:visible')
      const count = await inputs.count()
      await inputs.nth(count - 3).fill(t.user)
      await inputs.nth(count - 2).fill(t.relation)
      await inputs.nth(count - 1).fill(t.object)
      await page.waitForTimeout(200)
      const saveBtns = page.getByRole('button', { name: /^save$/i })
      const n = await saveBtns.count()
      await saveBtns.nth(n - 1).click()
      await page.waitForTimeout(500)
      const newCount = await page.locator('input[type="text"]:visible').count()
      if (newCount < count && i < fixture.tuples.length - 1) {
        await page.getByRole('button', { name: /^add tuple$/i }).click()
        await page.waitForTimeout(400)
      }
    }
    // Close dialog if still open
    const cancel = page.getByRole('button', { name: /^cancel$/i })
    if (await cancel.first().isVisible().catch(() => false)) {
      await cancel.first().click().catch(() => {})
      await page.waitForTimeout(400)
    }
    await spreadGraph(page)
    await shot(page, 'tuples.png')

    console.log('[playground] Opening Tuple Queries panel...')
    await page.getByText('Tuple Queries', { exact: false }).click()
    await page.waitForTimeout(1200)

    console.log('[playground] check-alice-lesson (allowed)...')
    await runQuery(page, CHECK_ALLOWED)
    await shot(page, 'check-alice-lesson.png')

    if (!SKIP_CHECKS) {
      console.log('[playground] check-capability (denied)...')
      await runQuery(page, CHECK_DENIED)
      await shot(page, 'check-capability.png')
    }

    console.log('[playground] Done.')
  } finally {
    await browser.close()
  }
}

main().catch((err: Error) => {
  console.error('[playground] Error:', err.message)
  process.exit(1)
})
