import { describe, expect, it } from 'vitest'
import { BONZI_ATLAS } from '../bonziAtlas'
import {
  BONZI_ANIMS,
  BONZI_EXPLAIN_POSE,
  BONZI_HOLDS,
  BONZI_MOUTHS,
  BONZI_REST,
  bonziFramesInUse,
  mouthFor,
  spriteCell,
  stepsToRest,
  type SpriteStep,
} from '../bonziSprites'

const lastFrame = (steps: readonly SpriteStep[]) => steps[steps.length - 1].frame

describe('bonzi sprite atlas', () => {
  it('packs every frame the animations use', () => {
    const packed = new Set<number>(BONZI_ATLAS.frames)
    expect(bonziFramesInUse().filter((frame) => !packed.has(frame))).toEqual([])
  })

  it('gives every packed frame its own cell inside the gutters', () => {
    const cells = BONZI_ATLAS.frames.map((frame) => spriteCell(frame))
    expect(new Set(cells.map((cell) => `${cell?.x},${cell?.y}`)).size).toBe(BONZI_ATLAS.frames.length)
    const pitchW = BONZI_ATLAS.cellW + 2 * BONZI_ATLAS.pad
    const pitchH = BONZI_ATLAS.cellH + 2 * BONZI_ATLAS.pad
    for (const cell of cells) {
      expect(cell).not.toBeNull()
      expect((cell?.x ?? 0) % pitchW).toBe(BONZI_ATLAS.pad)
      expect((cell?.y ?? 0) % pitchH).toBe(BONZI_ATLAS.pad)
    }
    expect(spriteCell(9999)).toBeNull()
  })

  it('ends each animation in the pose the next one starts from', () => {
    expect(lastFrame(BONZI_ANIMS.show)).toBe(BONZI_REST)
    expect(lastFrame(BONZI_ANIMS.wave)).toBe(BONZI_REST)
    expect(lastFrame(BONZI_ANIMS.explainIn)).toBe(BONZI_EXPLAIN_POSE)
    expect(lastFrame(BONZI_ANIMS.explainOut)).toBe(BONZI_REST)
    expect(lastFrame(BONZI_ANIMS.eat)).toBe(BONZI_REST)
    for (const hold of Object.values(BONZI_HOLDS)) expect(lastFrame(hold.out)).toBe(BONZI_REST)
  })

  it('finds the way back to rest from any held pose, or from partway in or out', () => {
    expect(stepsToRest(BONZI_REST)).toBeNull()
    expect(stepsToRest(846)).toBeNull() // mid-snack: that animation ends at rest by itself
    for (const hold of Object.values(BONZI_HOLDS)) {
      const pose = lastFrame(hold.in)
      expect(stepsToRest(pose)).toEqual(hold.out)
      for (const step of [...hold.in, ...hold.out]) {
        if (step.frame === BONZI_REST) continue
        expect(lastFrame(stepsToRest(step.frame) ?? [])).toBe(BONZI_REST)
      }
    }
    // Partway out, it carries on from there instead of starting over.
    const out = BONZI_HOLDS.explain.out
    expect(stepsToRest(out[2].frame)).toEqual(out.slice(2))
  })

  it('has lip-sync mouths for the poses he talks in', () => {
    expect(BONZI_MOUTHS[BONZI_REST]?.length).toBeGreaterThan(1)
    expect(BONZI_MOUTHS[BONZI_EXPLAIN_POSE]?.length).toBeGreaterThan(1)
  })

  it('opens his mouth wider the louder he talks', () => {
    const rest = BONZI_MOUTHS[BONZI_REST] ?? []
    expect(mouthFor(BONZI_REST, 0, 0)).toBeNull()
    expect(mouthFor(1141, 3, 0)).toBeNull() // no mouths mid-animation
    expect(mouthFor(BONZI_REST, 1, 0)).toBe(rest[0])
    expect(mouthFor(BONZI_REST, 3, 1)).toBe(rest[rest.length - 1])
    for (let level = 1; level < 3; level += 1) {
      expect(rest.indexOf(mouthFor(BONZI_REST, level + 1, 0) ?? -1)).toBeGreaterThan(
        rest.indexOf(mouthFor(BONZI_REST, level, 0) ?? -1),
      )
    }
  })
})
