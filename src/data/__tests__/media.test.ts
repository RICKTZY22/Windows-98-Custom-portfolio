import { describe, expect, it } from 'vitest'
import { parseMediaEnv } from '../media'

describe('media environment parsing', () => {
  it('parses the documented JSON object array format', () => {
    expect(parseMediaEnv('[{"name":"photo.png","src":"https://blob.example/photo.png"}]')).toEqual([
      { name: 'photo.png', src: 'https://blob.example/photo.png' },
    ])
  })

  it('handles values accidentally pasted with an extra JSON string layer', () => {
    const doubleEncoded = JSON.stringify('[{"name":"photo.webp","src":"https://blob.example/photo.webp"}]')

    expect(parseMediaEnv(doubleEncoded)).toEqual([{ name: 'photo.webp', src: 'https://blob.example/photo.webp' }])
  })

  it('accepts URL-only lists and derives readable filenames', () => {
    expect(parseMediaEnv('https://blob.example/haha%20(4).png, https://blob.example/gallery/cover.avif?download=1')).toEqual([
      { name: 'haha (4).png', src: 'https://blob.example/haha%20(4).png' },
      { name: 'cover.avif', src: 'https://blob.example/gallery/cover.avif?download=1' },
    ])
  })
})
