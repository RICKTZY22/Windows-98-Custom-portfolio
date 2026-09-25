import { describe, expect, it } from 'vitest'
import { BONZI_JOKES, BONZI_NOT_A_MENU, BONZI_SAY_AS, bonziReply, bonziVoiceLines, pickLine } from '../bonziBrain'

describe('bonzi brain (scripted chat)', () => {
  const first = () => 0

  it('ignores empty messages', () => {
    expect(bonziReply('   ')).toBeNull()
  })

  it('routes chat commands to the right intent', () => {
    expect(BONZI_JOKES).toContain(bonziReply('tell me a joke', { random: first })?.text)
    expect(bonziReply('sing me a song')?.mood).toBe('sing')
    expect(bonziReply('can you search the web?')?.effect).toBe('search')
    expect(bonziReply('please be quiet')?.effect).toBe('quiet')
    expect(bonziReply('talk to me')?.effect).toBe('chatty')
  })

  it('needs two goodbyes before it lets the window close', () => {
    expect(bonziReply('bye')?.effect).toBe('byeWarn')
    expect(bonziReply('bye', { byeArmed: true })?.effect).toBe('bye')
  })

  it('does not treat a stray "later" as a goodbye', () => {
    expect(bonziReply('I will do it later')?.effect).toBeUndefined()
  })

  it('tells the time to the nearest hour', () => {
    const at = (hours: number, minutes: number) => bonziReply('what time is it?', { now: new Date(2026, 0, 1, hours, minutes) })?.text
    expect(at(15, 4)).toContain("about three o'clock")
    expect(at(14, 40)).toContain("about three o'clock")
    expect(at(23, 45)).toContain("about twelve o'clock")
    expect(at(0, 10)).toContain("about twelve o'clock")
  })

  it('lists every line he can say for the recorded voice', () => {
    const lines = bonziVoiceLines()
    const texts = lines.map((line) => line.text)
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts).toContain(BONZI_NOT_A_MENU)
    expect(texts.filter((text) => text.includes("o'clock"))).toHaveLength(12)
    // Every reply the brain can give is on the list (sampled across intents).
    for (const message of ['bye', 'be quiet', 'talk to me', 'help', 'search the web', 'weather', 'are you spyware', 'banana', 'thanks', 'asdf', 'why?']) {
      expect(texts).toContain(bonziReply(message)?.text)
    }
    // Each pronunciation override still matches a real line.
    for (const text of Object.keys(BONZI_SAY_AS)) expect(texts).toContain(text)
  })

  it('does not repeat the line it just said', () => {
    const said = pickLine(BONZI_JOKES, first)
    expect(pickLine(BONZI_JOKES, first, said)).not.toBe(said)
  })

  it('always has something to say', () => {
    expect(bonziReply('asdfghjkl')?.text).toBeTruthy()
    expect(bonziReply('why is the sky blue?')?.text).toBeTruthy()
  })
})
