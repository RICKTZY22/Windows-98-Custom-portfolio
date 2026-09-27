// Bonzi's Web lookup: "who is Albert Einstein?" is answered from Wikipedia, the
// same free, keyless API that Internet Explorer's search page uses (it accepts
// calls from any page). He reads a sentence or two of the article's intro, with
// the bracketed bits (pronunciations, dates, units) taken out so it reads well
// aloud and fits his balloon.

import { BONZI_LOOKUP_OPENERS } from './bonziContent'

const ENDPOINT =
  'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1' +
  '&generator=search&gsrlimit=1&gsrnamespace=0&prop=extracts&exintro=1&explaintext=1&exsentences=3&gsrsearch='

export type BonziLookup = { kind: 'found'; title: string; summary: string } | { kind: 'vague' } | { kind: 'none' }

/** Looks `query` up on Wikipedia. Rejects when the network does. */
export async function lookUp(query: string, signal?: AbortSignal): Promise<BonziLookup> {
  const response = await fetch(ENDPOINT + encodeURIComponent(query), { signal })
  if (!response.ok) throw new Error(`Wikipedia answered ${response.status}`)
  const data = (await response.json()) as { query?: { pages?: Record<string, { title?: string; extract?: string }> } }
  const page = Object.values(data.query?.pages ?? {})[0]
  if (!page?.extract) return { kind: 'none' }
  // A disambiguation page: the question could mean a lot of things.
  if (/\(disambiguation\)$/.test(page.title ?? '') || /\b(may|might|can) (also )?refer to\b/.test(page.extract)) {
    return { kind: 'vague' }
  }
  const summary = summarize(page.extract)
  return summary ? { kind: 'found', title: page.title ?? query, summary } : { kind: 'none' }
}

/** What he says about something he found. */
export function lookupLine(summary: string, random: () => number = Math.random): string {
  const opener = BONZI_LOOKUP_OPENERS[Math.floor(random() * BONZI_LOOKUP_OPENERS.length) % BONZI_LOOKUP_OPENERS.length]
  return `${opener}${summary}`
}

// A period after one of these does not end the sentence ("Dr.", "J. R. R.", "U.S.").
const ABBREVIATION =
  /(?:^|\s)(?:[A-Z]|Mr|Mrs|Ms|Dr|St|Jr|Sr|Mt|Ft|Gen|Col|Lt|Sgt|Rev|Inc|Ltd|Co|Corp|No|vs|etc|approx|ca|c|e\.g|i\.e|U\.S|U\.K|D\.C)\.$/

function sentencesOf(text: string): string[] {
  const sentences: string[] = []
  let start = 0
  const ends = /[.!?](?=\s+["'\p{Lu}\d]|$)/gu
  for (let match = ends.exec(text); match; match = ends.exec(text)) {
    const stop = match.index + 1
    if (stop < text.length && ABBREVIATION.test(text.slice(start, stop))) continue
    sentences.push(text.slice(start, stop).trim())
    start = stop
  }
  if (start < text.length) sentences.push(text.slice(start).trim())
  return sentences.filter(Boolean)
}

/** The first sentence or two of an article intro, at most `maxLength` characters. */
export function summarize(extract: string, maxLength = 180): string | null {
  let text = extract.replace(/\s+/g, ' ')
  // Nested brackets come out from the inside, a level per pass.
  for (let pass = 0; pass < 3; pass += 1) text = text.replace(/\s*\([^()]*\)/g, '')
  text = text
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
  const [first, second] = sentencesOf(text)
  if (!first) return null
  let summary = first
  if (first.length < 90 && second && first.length + 1 + second.length <= maxLength) summary = `${first} ${second}`
  if (summary.length <= maxLength) return summary
  const cut = summary.slice(0, maxLength)
  const space = cut.lastIndexOf(' ')
  return `${cut.slice(0, space > maxLength / 2 ? space : maxLength).replace(/[,;:\s]+$/, '')}...`
}
