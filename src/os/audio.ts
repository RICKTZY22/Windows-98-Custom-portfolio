import type { SoundId } from '../types'

/**
 * WebAudio synth for every system sound. All jingles are original retro-style
 * compositions — nothing here recreates Microsoft audio. AudioContext creation
 * is lazy and guarded so importing this module is safe in SSR/tests.
 */

type AudioContextCtor = new () => AudioContext
type OfflineAudioContextCtor = new (channels: number, length: number, sampleRate: number) => OfflineAudioContext

let sharedContext: AudioContext | null = null
let unlocked = false

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') {
    return null
  }
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

function offlineContextCtor(): OfflineAudioContextCtor | null {
  if (typeof window === 'undefined') {
    return null
  }
  const w = window as unknown as {
    OfflineAudioContext?: OfflineAudioContextCtor
    webkitOfflineAudioContext?: OfflineAudioContextCtor
  }
  return w.OfflineAudioContext ?? w.webkitOfflineAudioContext ?? null
}

export function unlockAudio(): void {
  const Ctor = audioContextCtor()
  if (!Ctor) {
    return
  }
  if (!sharedContext) {
    try {
      sharedContext = new Ctor()
    } catch {
      return
    }
  }
  if (sharedContext.state === 'suspended') {
    void sharedContext.resume()
  }
  unlocked = true
}

export function isAudioUnlocked(): boolean {
  return unlocked && sharedContext !== null && sharedContext.state !== 'closed'
}

// ---------------------------------------------------------------------------
// Synth building blocks
// ---------------------------------------------------------------------------

type ToneOpts = {
  type?: OscillatorType
  freq: number
  endFreq?: number
  start: number
  duration: number
  peak: number
  attack?: number
}

// All recipe start times are relative to "now". They must be anchored to the
// context's current time, otherwise on the long-lived live AudioContext (whose
// currentTime grows to tens of seconds) every event lands in the past, the gain
// envelope has already decayed to its floor, and the sound is silent. A tiny
// lookahead avoids scheduling exactly at currentTime (which can click). On an
// OfflineAudioContext currentTime is 0, so rendering is unaffected.
const SCHEDULE_LOOKAHEAD = 0.02

function tone(ctx: BaseAudioContext, dest: AudioNode, master: number, opts: ToneOpts): void {
  const start = ctx.currentTime + SCHEDULE_LOOKAHEAD + opts.start
  const osc = ctx.createOscillator()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, start)
  if (opts.endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.endFreq), start + opts.duration)
  }
  const gain = ctx.createGain()
  const attack = Math.min(opts.attack ?? 0.008, opts.duration / 2)
  const peak = opts.peak * master
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(Math.max(0.0001, peak), start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration)
  osc.connect(gain)
  gain.connect(dest)
  osc.start(start)
  osc.stop(start + opts.duration + 0.05)
}

type NoiseOpts = {
  start: number
  duration: number
  peak: number
  filterType?: BiquadFilterType
  freq?: number
  endFreq?: number
  q?: number
  attack?: number
}

function noise(ctx: BaseAudioContext, dest: AudioNode, master: number, opts: NoiseOpts): void {
  const start = ctx.currentTime + SCHEDULE_LOOKAHEAD + opts.start
  const length = Math.max(1, Math.ceil(opts.duration * ctx.sampleRate))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = opts.filterType ?? 'bandpass'
  filter.Q.value = opts.q ?? 1
  filter.frequency.setValueAtTime(opts.freq ?? 1000, start)
  if (opts.endFreq !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, opts.endFreq), start + opts.duration)
  }
  const gain = ctx.createGain()
  const attack = Math.min(opts.attack ?? 0.005, opts.duration / 2)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(Math.max(0.0001, opts.peak * master), start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  source.start(start)
}

// ---------------------------------------------------------------------------
// Sound recipes
// ---------------------------------------------------------------------------

const SOUND_DURATIONS: Record<SoundId, number> = {
  startup: 2.6,
  shutdown: 1.9,
  error: 0.4,
  warn: 0.45,
  click: 0.05,
  menuOpen: 0.1,
  recycle: 0.55,
  networkUp: 0.55,
  networkDown: 0.55,
  launch: 0.4,
  minimize: 0.22,
  restore: 0.22,
  ding: 0.9,
  tada: 1.4,
}

/** Schedules a sound relative to ctx.currentTime. Returns its nominal duration. Exported for tests. */
export function scheduleSound(ctx: BaseAudioContext, dest: AudioNode, id: SoundId, volume: number): number {
  const master = Math.max(0, Math.min(1, volume))
  switch (id) {
    case 'startup': {
      // Warm pad chord rising into a soft bell — original jingle.
      const chord = [220, 277.18, 329.63, 440]
      chord.forEach((freq, index) => {
        tone(ctx, dest, master, {
          type: 'triangle',
          freq,
          start: index * 0.05,
          duration: 2.3,
          peak: 0.12,
          attack: 0.9,
        })
      })
      tone(ctx, dest, master, { type: 'sine', freq: 880, start: 1.1, duration: 1.4, peak: 0.1, attack: 0.05 })
      tone(ctx, dest, master, { type: 'sine', freq: 1108.73, start: 1.45, duration: 1.1, peak: 0.07, attack: 0.05 })
      noise(ctx, dest, master, { start: 0, duration: 1.2, peak: 0.015, filterType: 'lowpass', freq: 600, attack: 0.6 })
      break
    }
    case 'shutdown': {
      // Gentle descending farewell.
      const steps = [523.25, 392, 329.63, 261.63]
      steps.forEach((freq, index) => {
        tone(ctx, dest, master, {
          type: 'triangle',
          freq,
          start: index * 0.28,
          duration: 0.8,
          peak: 0.14,
          attack: 0.06,
        })
      })
      tone(ctx, dest, master, { type: 'sine', freq: 130.81, start: 0.84, duration: 1.0, peak: 0.1, attack: 0.2 })
      break
    }
    case 'error': {
      tone(ctx, dest, master, { type: 'square', freq: 196, endFreq: 130, start: 0, duration: 0.32, peak: 0.16 })
      tone(ctx, dest, master, { type: 'square', freq: 98, start: 0, duration: 0.3, peak: 0.08 })
      break
    }
    case 'warn': {
      tone(ctx, dest, master, { type: 'square', freq: 392, start: 0, duration: 0.16, peak: 0.12 })
      tone(ctx, dest, master, { type: 'square', freq: 311.13, start: 0.2, duration: 0.2, peak: 0.12 })
      break
    }
    case 'click': {
      noise(ctx, dest, master, { start: 0, duration: 0.018, peak: 0.2, filterType: 'highpass', freq: 2500 })
      tone(ctx, dest, master, { type: 'square', freq: 1800, start: 0, duration: 0.012, peak: 0.08 })
      break
    }
    case 'menuOpen': {
      tone(ctx, dest, master, { type: 'sine', freq: 660, start: 0, duration: 0.07, peak: 0.1 })
      break
    }
    case 'recycle': {
      // Paper-crinkle: layered noise bursts sweeping down.
      noise(ctx, dest, master, { start: 0, duration: 0.5, peak: 0.16, freq: 3200, endFreq: 500, q: 0.8 })
      noise(ctx, dest, master, { start: 0.05, duration: 0.12, peak: 0.12, freq: 4200, q: 2 })
      noise(ctx, dest, master, { start: 0.22, duration: 0.1, peak: 0.1, freq: 2600, q: 2 })
      noise(ctx, dest, master, { start: 0.36, duration: 0.12, peak: 0.08, freq: 1500, q: 2 })
      break
    }
    case 'networkUp': {
      tone(ctx, dest, master, { type: 'sine', freq: 392, start: 0, duration: 0.18, peak: 0.12 })
      tone(ctx, dest, master, { type: 'sine', freq: 587.33, start: 0.2, duration: 0.3, peak: 0.12 })
      break
    }
    case 'networkDown': {
      tone(ctx, dest, master, { type: 'sine', freq: 587.33, start: 0, duration: 0.18, peak: 0.12 })
      tone(ctx, dest, master, { type: 'sine', freq: 392, start: 0.2, duration: 0.3, peak: 0.12 })
      break
    }
    case 'launch': {
      const arp = [523.25, 659.25, 783.99]
      arp.forEach((freq, index) => {
        tone(ctx, dest, master, { type: 'sine', freq, start: index * 0.08, duration: 0.16, peak: 0.1 })
      })
      break
    }
    case 'minimize': {
      tone(ctx, dest, master, { type: 'sine', freq: 620, endFreq: 240, start: 0, duration: 0.18, peak: 0.12 })
      break
    }
    case 'restore': {
      tone(ctx, dest, master, { type: 'sine', freq: 240, endFreq: 620, start: 0, duration: 0.18, peak: 0.12 })
      break
    }
    case 'ding': {
      tone(ctx, dest, master, { type: 'sine', freq: 880, start: 0, duration: 0.85, peak: 0.14, attack: 0.004 })
      tone(ctx, dest, master, { type: 'sine', freq: 1318.51, start: 0, duration: 0.5, peak: 0.06, attack: 0.004 })
      break
    }
    case 'tada': {
      // Tiny original fanfare: rising arpeggio into a held chord.
      const arp = [523.25, 659.25, 783.99]
      arp.forEach((freq, index) => {
        tone(ctx, dest, master, { type: 'triangle', freq, start: index * 0.12, duration: 0.22, peak: 0.13 })
      })
      const chord = [523.25, 659.25, 783.99, 1046.5]
      chord.forEach((freq) => {
        tone(ctx, dest, master, { type: 'triangle', freq, start: 0.4, duration: 0.9, peak: 0.09, attack: 0.02 })
      })
      noise(ctx, dest, master, { start: 0.4, duration: 0.35, peak: 0.03, filterType: 'highpass', freq: 6000 })
      break
    }
  }
  return SOUND_DURATIONS[id]
}

// ---------------------------------------------------------------------------
// Custom sound files — drop startup.mp3 / error.wav etc. into public/sounds/
// and they replace the synthesized jingles. The synth remains the fallback.
// ---------------------------------------------------------------------------

// Map OS sound events to the authentic Win98 sample files dropped into
// public/sounds/ under their original Windows names. Keeping the map means the
// real filenames need not be renamed, and unmapped ids can stay synth-only
// without producing optional-file 404s in production.
const CUSTOM_SOUND_FILES: Partial<Record<SoundId, string>> = {
  startup: 'The Microsoft Sound.wav',
  shutdown: 'LOGOFF.WAV',
  error: 'CHORD.WAV',
  warn: 'NOTIFY.WAV',
  click: 'START.WAV',
  recycle: 'RECYCLE.WAV',
  launch: 'CHIMES.WAV',
  ding: 'DING.WAV',
  tada: 'TADA.WAV',
}

const soundFiles = new Map<SoundId, HTMLAudioElement | null>()
let filesProbed = false

async function probeSoundFile(id: SoundId): Promise<void> {
  const mapped = CUSTOM_SOUND_FILES[id]
  if (!mapped) {
    soundFiles.set(id, null)
    return
  }
  const candidates = [`/sounds/${encodeURIComponent(mapped)}`]

  for (const url of candidates) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      const type = response.headers.get('content-type') ?? ''
      // Dev servers answer missing files with the SPA's index.html — only
      // accept real audio responses.
      if (response.ok && (type.startsWith('audio/') || type === 'application/octet-stream')) {
        const element = new Audio(url)
        element.preload = 'auto'
        soundFiles.set(id, element)
        return
      }
    } catch {
      // Network hiccup — try the next candidate.
    }
  }
  soundFiles.set(id, null)
}

/** Probe public/sounds/ once for custom files for every system sound. */
export function preloadSoundFiles(): void {
  if (
    filesProbed ||
    typeof window === 'undefined' ||
    typeof Audio === 'undefined' ||
    typeof fetch === 'undefined'
  ) {
    return
  }
  filesProbed = true
  ;(Object.keys(SOUND_DURATIONS) as SoundId[]).forEach((id) => {
    void probeSoundFile(id)
  })
}

/** True when a custom file backs this sound id. */
export function hasCustomSoundFile(id: SoundId): boolean {
  return Boolean(soundFiles.get(id))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function playSound(id: SoundId, volume: number): void {
  const file = soundFiles.get(id)
  if (file) {
    try {
      const clone = file.cloneNode(true) as HTMLAudioElement
      clone.volume = Math.max(0, Math.min(1, volume))
      void clone.play().catch(() => {
        // Autoplay blocked before the first user gesture — stay silent.
      })
      return
    } catch {
      // Fall through to the synth.
    }
  }
  if (!unlocked || !sharedContext || sharedContext.state === 'closed') {
    return
  }
  if (sharedContext.state === 'suspended') {
    void sharedContext.resume()
  }
  try {
    scheduleSound(sharedContext, sharedContext.destination, id, volume)
  } catch {
    // Never let a sound effect crash the shell.
  }
}

function encodeWav(buffer: AudioBuffer): string {
  const samples = buffer.getChannelData(0)
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2
  const dataSize = samples.length * bytesPerSample
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true) // byte rate
  view.setUint16(32, bytesPerSample, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }

  // Base64-encode in chunks to avoid call-stack limits.
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

export async function renderSoundToWavDataUrl(id: SoundId): Promise<string> {
  const Ctor = offlineContextCtor()
  if (!Ctor) {
    throw new Error('Audio rendering is not available in this environment.')
  }
  const sampleRate = 44100
  const duration = SOUND_DURATIONS[id] + 0.1
  const offline = new Ctor(1, Math.ceil(duration * sampleRate), sampleRate)
  scheduleSound(offline, offline.destination, id, 0.9)
  const buffer = await offline.startRendering()
  return encodeWav(buffer)
}

export const soundCatalog: Array<{ id: SoundId; label: string; description: string }> = [
  { id: 'startup', label: 'Startup', description: 'Warm pad chord that rises while Windows loads.' },
  { id: 'shutdown', label: 'Shutdown', description: 'Gentle descending farewell jingle.' },
  { id: 'error', label: 'Error', description: 'Low square-wave ding for critical messages.' },
  { id: 'warn', label: 'Warning', description: 'Two-tone caution blip.' },
  { id: 'click', label: 'Click', description: 'Ten-millisecond mouse tick.' },
  { id: 'menuOpen', label: 'Menu Open', description: 'Soft pop when a menu unfolds.' },
  { id: 'recycle', label: 'Recycle', description: 'Paper-crinkle sweep for deleted files.' },
  { id: 'networkUp', label: 'Network Up', description: 'Rising two-note connect chime.' },
  { id: 'networkDown', label: 'Network Down', description: 'Falling two-note disconnect chime.' },
  { id: 'launch', label: 'Launch', description: 'Quick ascending arpeggio for new windows.' },
  { id: 'minimize', label: 'Minimize', description: 'Short slide down.' },
  { id: 'restore', label: 'Restore', description: 'Short slide back up.' },
  { id: 'ding', label: 'Ding', description: 'Classic single bell tone.' },
  { id: 'tada', label: 'Tada', description: 'Tiny fanfare for big moments.' },
]
