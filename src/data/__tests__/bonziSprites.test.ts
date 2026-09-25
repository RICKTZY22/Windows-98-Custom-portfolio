import { describe, expect, it } from 'vitest'
import { BONZI_ATLAS } from '../bonziAtlas'
import {
  BONZI_ANIMS,
  BONZI_EXPLAIN_POSE,
  BONZI_MOUTHS,
  BONZI_REST,
  bonziFramesInUse,
  spriteCell,
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
  })

  it('has lip-sync mouths for the poses he talks in', () => {
    expect(BONZI_MOUTHS[BONZI_REST]?.length).toBeGreaterThan(1)
    expect(BONZI_MOUTHS[BONZI_EXPLAIN_POSE]?.length).toBeGreaterThan(1)
  })
})
