import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'

import { ALL_TYPES, MUST_APPEAR, fixtureCard } from './cardFixture'
import { renderEmailHtml } from '../../export/emailHtml'

// rasterizeChart won't work in jsdom (no canvas / layout), so mock it.
vi.mock('../../export/chartRasterizer', () => ({
  rasterizeChart: vi.fn().mockResolvedValue(null),
}))

describe('renderEmailHtml', () => {
  it('renders every block type', async () => {
    const html = await renderEmailHtml(fixtureCard())
    const missing = ALL_TYPES.filter((t) => !html.includes(MUST_APPEAR[t]))
    expect(missing, `no renderer yet for: ${missing.join(', ')}`).toEqual([])
  })

  it('marks every table as presentational', async () => {
    const tables = (await renderEmailHtml(fixtureCard())).match(/<table[^>]*>/g) ?? []
    expect(tables.length).toBeGreaterThan(0)
    for (const tag of tables) {
      expect(tag).toContain('role="presentation"')
    }
  })

  it('embeds uploaded images as <img> with data URLs', async () => {
    const html = await renderEmailHtml(fixtureCard())
    expect(html).toMatch(/<img[^>]*src="data:image\/png;base64,/i)
  })

  it('embeds rasterized charts as <img> when rasterization succeeds', async () => {
    const { rasterizeChart } = await import('../../export/chartRasterizer')
    vi.mocked(rasterizeChart).mockResolvedValueOnce('data:image/png;base64,chart-bytes')

    const html = await renderEmailHtml(fixtureCard())
    expect(html).toContain('data:image/png;base64,chart-bytes')
  })

  it('falls back to a table when chart rasterization fails', async () => {
    const html = await renderEmailHtml(fixtureCard())
    expect(html).toContain('Sprint velocity')
    expect(html).toContain('Sprint 1')
  })

  it('uses no flexbox or grid', async () => {
    expect(await renderEmailHtml(fixtureCard())).not.toMatch(/display:\s*(flex|grid)/i)
  })

  it('uses inline styles only', async () => {
    const html = await renderEmailHtml(fixtureCard())
    expect(html).not.toMatch(/<style/i)
    expect(html).not.toMatch(/class=/i)
  })

  it('states the status as a word, not only as the stripe colour', async () => {
    const html = await renderEmailHtml(fixtureCard())

    expect(html).toContain('Shipping on schedule')
    expect(html).toContain('border-left')
  })

  it('escapes user text', async () => {
    const card = fixtureCard()
    card.blocks = [
      {
        id: 'b1',
        type: 'header',
        order: 0,
        data: { project_name: 'Test', update_date: '2026', author: '<script>x</script>' },
      },
    ]
    const html = await renderEmailHtml(card)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('has no accessibility violations', async () => {
    document.body.innerHTML = await renderEmailHtml(fixtureCard())
    const results = await axe(document.body, { rules: { region: { enabled: false } } })
    expect(results).toHaveNoViolations()
  })
})
