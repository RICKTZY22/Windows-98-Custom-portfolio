import { useId } from 'react'

// Bonzi, drawn as an original SVG in the style of the 1999 character (soft,
// pre-rendered-3D shading lit from the upper left, no hard outlines). It is not
// traced from, or copied out of, the original sprite. Parts are separate groups
// so CSS can animate them around their joints while he talks (head nod, brow
// raise, arm gesture) and walks (legs); see BonziBuddyApp.css. The parent picks
// the mouth shape to lip-sync while speech plays.

const MOUTH = '#2e0d3d'
const TONGUE = '#e46f8d'
const FEATURE = '#4a1f6e'

// 0 = closed smile; 1..3 = progressively wider open shapes for lip-sync.
function Mouth({ frame }: { frame: number }) {
  switch (frame) {
    case 1:
      return <ellipse cx="60" cy="63.5" rx="5" ry="2.8" fill={MOUTH} />
    case 2:
      return (
        <>
          <ellipse cx="60" cy="64" rx="6.5" ry="5" fill={MOUTH} />
          <ellipse cx="60" cy="66.6" rx="4" ry="2" fill={TONGUE} />
        </>
      )
    case 3:
      return (
        <>
          <ellipse cx="60" cy="65" rx="7.5" ry="6.5" fill={MOUTH} />
          <rect x="54" y="58.8" width="12" height="2.6" rx="1.2" fill="#fbf7ff" />
          <ellipse cx="60" cy="69" rx="4.8" ry="2.6" fill={TONGUE} />
        </>
      )
    default:
      return (
        <>
          <path d="M47 61 Q 60 70.5 73 61" stroke={FEATURE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M45.5 59.5 Q 46.5 61.5 48 61.6" stroke={FEATURE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M74.5 59.5 Q 73.5 61.5 72 61.6" stroke={FEATURE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </>
      )
  }
}

export function BonziFigure({ blinking, mouthFrame }: { blinking: boolean; mouthFrame: number }) {
  // Namespaced gradient/filter ids so they can never collide with other SVGs.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fur = `${uid}-fur`
  const furDark = `${uid}-fur-dark`
  const face = `${uid}-face`
  const belly = `${uid}-belly`
  const eye = `${uid}-eye`
  const soft = `${uid}-soft`

  return (
    <svg className="bonzi-svg" width="132" height="165" viewBox="0 0 120 150" aria-hidden="true">
      <defs>
        <radialGradient id={fur} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#b27ae3" />
          <stop offset="45%" stopColor="#8a48c6" />
          <stop offset="100%" stopColor="#5b2787" />
        </radialGradient>
        <radialGradient id={furDark} cx="40%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#9658cf" />
          <stop offset="55%" stopColor="#6c32a3" />
          <stop offset="100%" stopColor="#461d6b" />
        </radialGradient>
        <radialGradient id={face} cx="40%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#f6e8fe" />
          <stop offset="55%" stopColor="#dbb8f3" />
          <stop offset="100%" stopColor="#bd8fe2" />
        </radialGradient>
        <radialGradient id={belly} cx="42%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#f2dffd" />
          <stop offset="60%" stopColor="#d6b0f0" />
          <stop offset="100%" stopColor="#b888de" />
        </radialGradient>
        <linearGradient id={eye} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="62%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d8cfe6" />
        </linearGradient>
        <filter id={soft} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Soft ground shadow so he reads as standing on the desktop */}
      <ellipse cx="60" cy="145" rx="31" ry="4.5" fill="#000" opacity="0.28" filter={`url(#${soft})`} />

      {/* Legs and feet (swing around the hips while walking) */}
      <g className="bz-leg bz-leg-l">
        <ellipse cx="47" cy="125" rx="9.5" ry="14" fill={`url(#${furDark})`} />
        <ellipse cx="43" cy="140" rx="12.5" ry="5.8" fill={`url(#${furDark})`} />
        <circle cx="33.5" cy="140.8" r="2.7" fill="#7c40b6" />
        <circle cx="38" cy="143" r="2.7" fill="#7c40b6" />
        <circle cx="43" cy="143.8" r="2.6" fill="#7c40b6" />
      </g>
      <g className="bz-leg bz-leg-r">
        <ellipse cx="73" cy="125" rx="9.5" ry="14" fill={`url(#${furDark})`} />
        <ellipse cx="77" cy="140" rx="12.5" ry="5.8" fill={`url(#${furDark})`} />
        <circle cx="86.5" cy="140.8" r="2.7" fill="#7c40b6" />
        <circle cx="82" cy="143" r="2.7" fill="#7c40b6" />
        <circle cx="77" cy="143.8" r="2.6" fill="#7c40b6" />
      </g>

      {/* Pear-shaped body with a big lavender belly */}
      <g>
        <path
          d="M60 68 C 84 68 94 90 92 108 C 90 124 76 130 60 130 C 44 130 30 124 28 108 C 26 90 36 68 60 68 Z"
          fill={`url(#${fur})`}
        />
        <ellipse cx="60" cy="105" rx="20" ry="22" fill={`url(#${belly})`} />
      </g>

      {/* Arms: thick and tubular (base stroke plus a soft highlight), hands clasped
          at the belly with interlaced fingers. The right arm gestures while talking. */}
      <g className="bz-arm bz-arm-l">
        <path d="M37 79 C 26 90 30 104 50 104" stroke="#7a3db8" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path
          d="M36 80 C 27 89 30 101 47 101.5"
          stroke="#a36ad8"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
        <ellipse cx="51" cy="104" rx="7.5" ry="6.5" fill={`url(#${fur})`} />
        <circle cx="56.5" cy="100.5" r="2.4" fill="#9656cf" />
        <circle cx="57.5" cy="104" r="2.4" fill="#9656cf" />
        <circle cx="56.5" cy="107.5" r="2.3" fill="#9656cf" />
      </g>
      <g className="bz-arm bz-arm-r">
        <path d="M83 79 C 94 90 90 104 70 104" stroke="#7a3db8" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path
          d="M84 80 C 93 89 90 101 73 101.5"
          stroke="#a36ad8"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity="0.45"
        />
        <ellipse cx="69" cy="104" rx="7.5" ry="6.5" fill={`url(#${fur})`} />
        <circle cx="63.5" cy="100.5" r="2.4" fill="#a066d6" />
        <circle cx="62.5" cy="104" r="2.4" fill="#a066d6" />
        <circle cx="63.5" cy="107.5" r="2.3" fill="#a066d6" />
      </g>

      {/* Head (nods around the neck while he talks) */}
      <g className="bz-head">
        {/* Ears sit half behind the head */}
        <circle cx="30" cy="47" r="7.5" fill={`url(#${fur})`} />
        <circle cx="30" cy="47" r="4.2" fill={`url(#${face})`} />
        <circle cx="90" cy="47" r="7.5" fill={`url(#${fur})`} />
        <circle cx="90" cy="47" r="4.2" fill={`url(#${face})`} />

        <ellipse cx="60" cy="45" rx="30" ry="27" fill={`url(#${fur})`} />
        {/* Little spiky tuft on top */}
        <path d="M54 20 L 56 13 L 59 18 L 61 11 L 63 18 L 66 13 L 66.5 20 Z" fill={`url(#${fur})`} />

        {/* Lavender face mask: two eye lobes joined to a big muzzle */}
        <path
          d="M60 33 C 52 25 38 27 37 40 C 36 48 41 52 44 54 C 40 60 43 72 60 73 C 77 72 80 60 76 54 C 79 52 84 48 83 40 C 82 27 68 25 60 33 Z"
          fill={`url(#${face})`}
        />

        {/* Brow ridge: a soft shadow where the purple forehead overhangs the eye
            patches (no painted eyebrows, like the original). Lifts while he talks. */}
        <g className="bz-brows">
          <path d="M41.5 33 Q 48 26.5 56 30.5" stroke="#5b2787" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M64 30.5 Q 72 26.5 78.5 33" stroke="#5b2787" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.5" />
        </g>

        {blinking ? (
          <>
            <path d="M44.5 43 Q 51.5 46.5 58.5 43" stroke="#2a0f3d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M61.5 43 Q 68.5 46.5 75.5 43" stroke="#2a0f3d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="51.5" cy="42" rx="7" ry="8.5" fill={`url(#${eye})`} />
            <ellipse cx="68.5" cy="42" rx="7" ry="8.5" fill={`url(#${eye})`} />
            <circle cx="53" cy="44" r="4" fill="#111" />
            <circle cx="67" cy="44" r="4" fill="#111" />
            <circle cx="54.5" cy="42.2" r="1.4" fill="#fff" />
            <circle cx="68.5" cy="42.2" r="1.4" fill="#fff" />
            <circle cx="52.2" cy="45.6" r="0.7" fill="#fff" opacity="0.8" />
            <circle cx="66.2" cy="45.6" r="0.7" fill="#fff" opacity="0.8" />
          </>
        )}

        {/* Nose with nostrils and a small highlight */}
        <ellipse cx="60" cy="54" rx="5.5" ry="3.4" fill={FEATURE} />
        <circle cx="57.8" cy="54.6" r="1.1" fill="#2a0f3d" />
        <circle cx="62.2" cy="54.6" r="1.1" fill="#2a0f3d" />
        <ellipse cx="58.6" cy="52.6" rx="1.6" ry="0.8" fill="#8d62b3" />

        <Mouth frame={mouthFrame} />
      </g>
    </svg>
  )
}
