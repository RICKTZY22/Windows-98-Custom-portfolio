import { BONZI_ATLAS } from './bonziAtlas'

// Animations built from the original BonziBUDDY Microsoft Agent frames. The atlas
// (public/bonzi/bonzi-atlas.webp, see scripts/build-bonzi-atlas.py) holds full-body
// "base" frames plus small overlay frames (mouths, blinks) that are drawn on top
// of a base pose, the way Microsoft Agent composed its characters. If the atlas
// is missing, the app falls back to the original SVG figure (BonziFigure.tsx).

export type SpriteStep = { frame: number; ms: number }

/** Frames from..to inclusive (either direction), each held `ms`. */
function run(from: number, to: number, ms: number): SpriteStep[] {
  const step = from <= to ? 1 : -1
  const steps: SpriteStep[] = []
  for (let frame = from; frame !== to + step; frame += step) steps.push({ frame, ms })
  return steps
}

export const BONZI_REST = 1
/** Arms-open pose he holds while explaining; has its own mouth overlays. */
export const BONZI_EXPLAIN_POSE = 33
/** Blink overlays for the rest pose: eyelids half shut, and shut. */
export const BONZI_HALF_BLINK = 26
export const BONZI_BLINK = 27

export const BONZI_ANIMS = {
  // Drops in on a vine from far away, lands, settles to rest.
  show: [...run(1141, 1157, 60), ...run(1158, 1160, 120), { frame: BONZI_REST, ms: 0 }],
  // Turns, grabs the vine and swings off until he is gone.
  hide: [...run(1168, 1173, 110), ...run(1174, 1188, 60)],
  wave: [...run(346, 364, 90), { frame: BONZI_REST, ms: 0 }],
  // Opens his arms to talk, and closes them again afterwards.
  explainIn: run(29, BONZI_EXPLAIN_POSE, 80),
  explainOut: [...run(32, 29, 80), { frame: 41, ms: 90 }, { frame: 42, ms: 90 }, { frame: BONZI_REST, ms: 0 }],
} satisfies Record<string, SpriteStep[]>

/** Lip-sync mouth overlays for each pose that can talk (other frames have none),
 *  ordered from nearly shut to wide open (measured from the frames). */
export const BONZI_MOUTHS: Readonly<Partial<Record<number, readonly number[]>>> = {
  [BONZI_REST]: [7, 6, 2, 3, 4, 5],
  [BONZI_EXPLAIN_POSE]: [34, 35, 39, 36, 37, 38],
}

/** The mouth overlay for a pose at a loudness level (1 quiet to 3 loud), or null
 *  when the pose has no mouths or he is silent. `variant` alternates within a level. */
export function mouthFor(frame: number, level: number, variant: number): number | null {
  const mouths = BONZI_MOUTHS[frame]
  if (!mouths || level <= 0) return null
  const band = Math.max(1, Math.floor(mouths.length / 3))
  const index = (Math.min(level, 3) - 1) * band + (variant % band)
  return mouths[Math.min(index, mouths.length - 1)]
}

/** Every frame the animations above reference (for the atlas consistency test). */
export function bonziFramesInUse(): number[] {
  const frames = new Set<number>([BONZI_REST, BONZI_EXPLAIN_POSE, BONZI_HALF_BLINK, BONZI_BLINK])
  for (const steps of Object.values(BONZI_ANIMS)) for (const step of steps) frames.add(step.frame)
  for (const mouths of Object.values(BONZI_MOUTHS)) for (const frame of mouths ?? []) frames.add(frame)
  return [...frames].sort((a, b) => a - b)
}

// The version query ties the image to this exact cell layout, so a rebuilt atlas
// is never paired with a stale cached copy.
export const BONZI_ATLAS_URL = `${import.meta.env.BASE_URL}${BONZI_ATLAS.file}?v=${BONZI_ATLAS.version}`

const cellIndex = new Map<number, number>(BONZI_ATLAS.frames.map((frame, index) => [frame, index]))

/** Top-left of a frame inside the atlas image, or null if it isn't packed. */
export function spriteCell(frame: number): { x: number; y: number } | null {
  const index = cellIndex.get(frame)
  if (index === undefined) return null
  const { cellW, cellH, pad, cols } = BONZI_ATLAS
  return {
    x: (index % cols) * (cellW + 2 * pad) + pad,
    y: Math.floor(index / cols) * (cellH + 2 * pad) + pad,
  }
}
