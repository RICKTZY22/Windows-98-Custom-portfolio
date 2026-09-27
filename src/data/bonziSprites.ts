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

const REST_STEP: SpriteStep = { frame: BONZI_REST, ms: 0 }

/** Hanging from a vine while he is dragged: straight down, and swung out a little
 *  or a lot. In the swung frames his body trails to the right of the vine, the way
 *  he hangs when carried leftwards (mirrored for rightwards). */
export const BONZI_HANG = { still: 1193, swing: 1194, swingFar: 1195 } as const

/** The hanging frame for a horizontal drag speed (px per ms), and whether to
 *  mirror it (carried rightwards). */
export function hangFrame(speed: number): { frame: number; mirrored: boolean } {
  const pace = Math.abs(speed)
  const frame = pace < 0.15 ? BONZI_HANG.still : pace < 0.7 ? BONZI_HANG.swing : BONZI_HANG.swingFar
  return { frame, mirrored: frame !== BONZI_HANG.still && speed > 0 }
}

export const BONZI_ANIMS = {
  // Drops in on a vine from far away, lands, settles to rest.
  show: [...run(1141, 1157, 60), ...run(1158, 1160, 120), REST_STEP],
  // Turns, grabs the vine and swings off until he is gone.
  hide: [...run(1168, 1173, 110), ...run(1174, 1188, 60)],
  wave: [...run(346, 364, 90), REST_STEP],
  // Opens his arms to talk, and closes them again afterwards.
  explainIn: run(29, BONZI_EXPLAIN_POSE, 80),
  explainOut: [...run(32, 29, 80), { frame: 41, ms: 90 }, { frame: 42, ms: 90 }, REST_STEP],
  // Pulls a banana from behind his back, peels it, eats it, tosses the peel.
  eat: [...run(826, 879, 85), REST_STEP],
  // Picked up with the mouse: reaches up, catches a vine and hangs on (the last
  // frame is held while you carry him).
  grab: [{ frame: 1192, ms: 70 }, { frame: BONZI_HANG.still, ms: 0 }],
  // Let go: drops, lands in a puff of dust, and stands back up.
  land: [...run(1196, 1198, 70), ...run(1199, 1202, 90), REST_STEP],
} satisfies Record<string, SpriteStep[]>

/** Poses he strikes and holds until told otherwise: the way in (ending on the
 *  held frame) and the way back to rest. */
export type SpriteHold = { in: SpriteStep[]; out: SpriteStep[] }

export const BONZI_HOLDS = {
  explain: { in: BONZI_ANIMS.explainIn, out: BONZI_ANIMS.explainOut },
  // Scratches his head while he "thinks" about a reply.
  think: { in: [...run(55, 59, 80), { frame: 65, ms: 90 }, { frame: 66, ms: 0 }], out: [{ frame: 65, ms: 80 }, ...run(59, 55, 70), REST_STEP] },
  // Cups a hand to his ear while the microphone is open.
  listen: { in: run(87, 92, 70), out: [...run(91, 87, 70), REST_STEP] },
  // Crosses his arms and turns away: "I am not leaving."
  huff: { in: run(495, 505, 80), out: [...run(504, 495, 55), REST_STEP] },
  // Clasps his hands and makes big eyes: "please don't uninstall me".
  plead: { in: run(1110, 1114, 90), out: [...run(1113, 1110, 80), REST_STEP] },
  // Hangs his head.
  sad: { in: run(1117, 1120, 120), out: [{ frame: 1121, ms: 120 }, REST_STEP] },
} satisfies Record<string, SpriteHold>

export type BonziHold = keyof typeof BONZI_HOLDS

/** The steps that take him from `frame` back to rest: the rest of a hold's way
 *  out when he is in, entering, or leaving a held pose. Null when he is already
 *  at rest or in a one-shot animation (which ends at rest by itself). */
export function stepsToRest(frame: number): SpriteStep[] | null {
  if (frame === BONZI_REST) return null
  for (const hold of Object.values(BONZI_HOLDS)) {
    const at = hold.out.findIndex((step) => step.frame === frame)
    if (at >= 0) return hold.out.slice(at)
    if (hold.in.some((step) => step.frame === frame)) return hold.out
  }
  return null
}

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
  const frames = new Set<number>([BONZI_REST, BONZI_EXPLAIN_POSE, BONZI_HALF_BLINK, BONZI_BLINK, ...Object.values(BONZI_HANG)])
  for (const steps of Object.values(BONZI_ANIMS)) for (const step of steps) frames.add(step.frame)
  for (const hold of Object.values(BONZI_HOLDS)) for (const step of [...hold.in, ...hold.out]) frames.add(step.frame)
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
