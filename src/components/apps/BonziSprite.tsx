import { BONZI_ATLAS } from '../../data/bonziAtlas'
import { BONZI_ATLAS_URL, BONZI_REST, spriteCell } from '../../data/bonziSprites'

// Draws one BonziBUDDY sprite frame, plus an optional overlay frame (a mouth or a
// blink) composited on top, the way Microsoft Agent layered its characters.

function SpriteLayer({ frame }: { frame: number }) {
  const cell = spriteCell(frame) ?? spriteCell(BONZI_REST)
  if (!cell) return null
  return (
    <div
      className="bonzi-sprite-layer"
      style={{
        backgroundImage: `url(${BONZI_ATLAS_URL})`,
        backgroundPosition: `-${cell.x}px -${cell.y}px`,
      }}
    />
  )
}

export function BonziSprite({ base, overlay }: { base: number; overlay: number | null }) {
  return (
    <div className="bonzi-sprite" style={{ width: BONZI_ATLAS.cellW, height: BONZI_ATLAS.cellH }} aria-hidden="true">
      <SpriteLayer frame={base} />
      {overlay !== null && <SpriteLayer frame={overlay} />}
      {/* Only his body is clickable/draggable, not the frame's empty margins. */}
      <div className="bonzi-sprite-hit" />
    </div>
  )
}
