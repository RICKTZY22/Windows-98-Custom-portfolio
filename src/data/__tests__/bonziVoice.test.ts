import { describe, expect, it } from 'vitest'
import { bonziVoiceLines } from '../bonziBrain'
import { BONZI_VOICE } from '../bonziVoice'

describe('bonzi recorded voice', () => {
  const lines = bonziVoiceLines().map((line) => line.text)

  it('only has clips for lines he can still say', () => {
    expect(Object.keys(BONZI_VOICE.clips).filter((text) => !lines.includes(text))).toEqual([])
  })

  it('has a clip for every line (re-run scripts/build-bonzi-voice.py after recording)', () => {
    expect(lines.filter((text) => !BONZI_VOICE.clips[text])).toEqual([])
  })

  it('stores each clip as a hashed mp3 with a loudness track', () => {
    for (const clip of Object.values(BONZI_VOICE.clips)) {
      expect(clip.file).toMatch(/^[0-9a-f]{10}\.mp3$/)
      expect(clip.env).toMatch(/^[0-3]+$/)
      expect(clip.env).toMatch(/[1-3]/) // not silent
    }
  })
})
