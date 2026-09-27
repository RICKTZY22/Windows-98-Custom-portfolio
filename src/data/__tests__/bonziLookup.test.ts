import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookUp, lookupLine, summarize } from '../bonziLookup'

describe('bonzi web lookup', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the first sentence, without the bracketed bits', () => {
    expect(
      summarize(
        'Albert Einstein (14 March 1879 – 18 April 1955) was a German-born theoretical physicist best known for developing the theory of relativity. Einstein also made important contributions to quantum theory.',
      ),
    ).toBe('Albert Einstein was a German-born theoretical physicist best known for developing the theory of relativity.')
  })

  it('adds a second sentence when the first is short', () => {
    expect(
      summarize('The Moon is the only natural satellite of Earth. It orbits Earth at an average distance of 384,399 kilometers (238,854 mi).'),
    ).toBe('The Moon is the only natural satellite of Earth. It orbits Earth at an average distance of 384,399 kilometers.')
  })

  it('does not stop at an abbreviation or an initial', () => {
    expect(summarize('J. R. R. Tolkien was an English writer. He wrote The Hobbit.')).toBe(
      'J. R. R. Tolkien was an English writer. He wrote The Hobbit.',
    )
  })

  it('cuts a long sentence to fit his balloon', () => {
    const summary = summarize(`${'word '.repeat(80)}end.`) ?? ''
    expect(summary.length).toBeLessThanOrEqual(183)
    expect(summary).toMatch(/\.\.\.$/)
  })

  it('opens the answer his way', () => {
    expect(lookupLine('The Moon is round.', () => 0)).toBe('Ooh, I know this one! The Moon is round.')
  })

  it('asks Wikipedia and spots a vague question', async () => {
    const answer = (extract: string, title = 'Mercury') =>
      vi.fn(async () => new Response(JSON.stringify({ query: { pages: { 1: { title, extract } } } })))
    vi.stubGlobal('fetch', answer('Mercury is the smallest planet in the Solar System.'))
    await expect(lookUp('mercury')).resolves.toEqual({
      kind: 'found',
      title: 'Mercury',
      summary: 'Mercury is the smallest planet in the Solar System.',
    })
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain('gsrsearch=mercury')
    vi.stubGlobal('fetch', answer('Mercury may refer to:', 'Mercury (disambiguation)'))
    await expect(lookUp('mercury')).resolves.toEqual({ kind: 'vague' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ batchcomplete: '' }))))
    await expect(lookUp('zzzxq')).resolves.toEqual({ kind: 'none' })
  })
})
