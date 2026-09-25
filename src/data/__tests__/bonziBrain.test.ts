import { describe, expect, it } from 'vitest'
import { BONZI_JOKES, bonziReply, pickLine } from '../bonziBrain'

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

  it('tells the time', () => {
    expect(bonziReply('what time is it?', { now: new Date(2026, 0, 1, 15, 4) })?.text).toContain('3:04 PM')
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
