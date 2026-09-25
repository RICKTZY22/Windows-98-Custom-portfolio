import './BonziBuddyApp.css'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'
import {
  BONZI_CHATTER,
  BONZI_GREETINGS,
  BONZI_NOT_A_MENU,
  BONZI_TICKLES,
  BONZI_WANDER_LINES,
  bonziReply,
  pickLine,
  type BonziMood,
  type BonziReply,
} from '../../data/bonziBrain'
import {
  BONZI_ANIMS,
  BONZI_ATLAS_URL,
  BONZI_BLINK,
  BONZI_EXPLAIN_POSE,
  BONZI_HALF_BLINK,
  BONZI_MOUTHS,
  BONZI_REST,
  type SpriteStep,
} from '../../data/bonziSprites'
import { BonziFigure } from './BonziFigure'
import { BonziSprite } from './BonziSprite'

// "Chat with Bonzi Buddy". The chat box lives in this app window; Bonzi himself is
// portaled out onto the desktop surface so he stands on the simulated OS (not
// clipped by the window) with his balloon above his head. He leaves when this
// window closes, and reboots, crashes and the worm close him like any program.
// Inert parody of the 1999 adware companion: a synthetic Web Speech voice and a
// scripted keyword chatbot (see data/bonziBrain.ts). He is drawn with the original
// character frames when the optional atlas in public/bonzi/ is installed (see
// data/bonziSprites.ts), and as an original SVG figure when it is not.

// His box on the desktop: one 200x160 sprite frame (he stands in the middle of
// it), or the 132x165 SVG figure centered in it.
const ACTOR_W = 200
const ACTOR_H = 165
const BALLOON_ROOM = 120 // keep this much room above him so his balloon stays on screen
const IDLE_MS = 20000 // silence before he chatters or wanders off
const THINK_MS = 650 // the "..." pause before a reply
const EXPLAIN_HOLD_MS = 700 // he keeps his arms open this long after a line
const ATLAS_TIMEOUT_MS = 8000 // stop waiting for the sprite atlas and draw the SVG figure

type Point = { x: number; y: number }
type Rect = { x: number; y: number; width: number; height: number }
/** How he is drawn: not decided yet, the original sprite frames, or the SVG figure. */
type Look = 'pending' | 'sprite' | 'svg'
/** Eyelids: open, half shut, shut. */
type Blink = 0 | 1 | 2

// One blink: half shut, shut, half shut, open (stage, then how long it holds).
const BLINK_STEPS: ReadonlyArray<readonly [Blink, number]> = [
  [1, 50],
  [2, 90],
  [1, 50],
  [0, 0],
]

// True when Bonzi's box at `at` would cover the given rect (his balloon may).
function coversRect(at: Point, rect: Rect): boolean {
  return (
    at.x < rect.x + rect.width && at.x + ACTOR_W > rect.x && at.y < rect.y + rect.height && at.y + ACTOR_H > rect.y
  )
}

// The area his top-left corner may occupy: fully on the desktop, with room above
// him for the balloon.
function actorBounds(host: HTMLElement | null) {
  const width = host?.clientWidth ?? window.innerWidth
  const height = host?.clientHeight ?? window.innerHeight - 33
  const maxX = Math.max(0, width - ACTOR_W)
  const maxY = Math.max(0, height - ACTOR_H)
  return { maxX, maxY, minY: Math.min(BALLOON_ROOM, maxY) }
}

function clampActor(point: Point, host: HTMLElement | null): Point {
  const { maxX, maxY, minY } = actorBounds(host)
  return {
    x: Math.round(Math.min(Math.max(point.x, 0), maxX)),
    y: Math.round(Math.min(Math.max(point.y, minY), maxY)),
  }
}

// The overlay stacked on a sprite frame: a mouth shape while he talks (in the
// poses that have them), otherwise his eyelids mid-blink when he stands at rest.
function spriteOverlay(frame: number, talking: boolean, mouthSeed: number, blink: Blink): number | null {
  const mouths = BONZI_MOUTHS[frame]
  if (talking && mouths) return mouths[mouthSeed % mouths.length]
  if (frame !== BONZI_REST || blink === 0) return null
  return blink === 1 ? BONZI_HALF_BLINK : BONZI_BLINK
}

export function BonziBuddyApp({ windowId }: AppProps) {
  const { state, playSound, setWindowTitle, openApp, closeWindow } = useOs()
  // Portal target: the desktop surface that windows live on (same coordinates).
  const [host] = useState<HTMLElement | null>(() => document.querySelector<HTMLElement>('.desktop'))
  // Start beside the chat window, standing level with its bottom edge.
  const [actorPos, setActorPos] = useState<Point>(() => {
    const win = state.windows.find((item) => item.instanceId === windowId)
    return clampActor(
      {
        x: (win?.x ?? 180) + (win?.width ?? 380) - 20,
        y: (win?.y ?? 110) + (win?.height ?? 230) - ACTOR_H + 10,
      },
      host,
    )
  })
  const [look, setLook] = useState<Look>('pending')
  const [baseFrame, setBaseFrame] = useState<number>(BONZI_ANIMS.show[0].frame)
  const [draft, setDraft] = useState('')
  const [balloonText, setBalloonText] = useState<string>(() => pickLine(BONZI_GREETINGS))
  const [showBalloon, setShowBalloon] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [mood, setMood] = useState<BonziMood>('wave')
  const [talking, setTalking] = useState(false)
  const [mouthSeed, setMouthSeed] = useState(0)
  const [blink, setBlink] = useState<Blink>(0)
  const [walking, setWalking] = useState(false)
  const [chatter, setChatter] = useState(true)

  const lastLineRef = useRef(balloonText)
  // When Bonzi last did anything. Chatter and wandering wait for a stretch of
  // silence, so he never talks over a reply the visitor just asked for.
  const lastActivityRef = useRef(0)
  const byeArmedUntilRef = useRef(0)
  const suppressClickRef = useRef(false)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; base: Point; moved: boolean } | null>(
    null,
  )
  const timersRef = useRef({ hide: 0, reply: 0, walk: 0, effect: 0, close: 0, talk: 0, seq: 0 })
  // The utterance currently speaking. Events from a line that was cut off by a
  // newer one are ignored, so they can't stop the new line's animation.
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  // Sprite playback, mirrored for timers and callbacks: how he is drawn, the frame
  // on screen, and whether an animation still has frames left to play.
  const lookRef = useRef<Look>('pending')
  const frameRef = useRef(baseFrame)
  const busyRef = useRef(false)
  // Where the chat window is, so his wandering doesn't park him on the text box.
  const chatRectRef = useRef<Rect | null>(null)
  const chatWindow = state.windows.find((item) => item.instanceId === windowId)
  useEffect(() => {
    chatRectRef.current =
      chatWindow && !chatWindow.minimized && !chatWindow.maximized
        ? { x: chatWindow.x, y: chatWindow.y, width: chatWindow.width, height: chatWindow.height }
        : null
  }, [chatWindow])

  useEffect(() => {
    setWindowTitle(windowId, 'Chat with Bonzi Buddy')
  }, [setWindowTitle, windowId])

  // A high, quick synthetic voice: squeaky and childish. No recorded audio is used.
  // If the browser has no speech (or blocks it), he still mouths the line.
  const speak = useCallback((text: string) => {
    const timers = timersRef.current
    window.clearTimeout(timers.talk)
    const mouthItSilently = () => {
      // Deferred so talking never flips synchronously inside an effect.
      timers.talk = window.setTimeout(() => {
        setTalking(true)
        timers.talk = window.setTimeout(() => setTalking(false), Math.min(9000, 700 + text.length * 55))
      }, 0)
    }
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) {
      mouthItSilently()
      return
    }
    try {
      synth.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utterRef.current = utter
      const voices = synth.getVoices()
      const preferred =
        voices.find((v) => /^en/i.test(v.lang) && /zira|samantha|karen|tessa|victoria|female|google us english/i.test(v.name)) ??
        voices.find((v) => /^en/i.test(v.lang)) ??
        voices[0]
      if (preferred) utter.voice = preferred
      utter.pitch = 1.9
      utter.rate = 1.12
      utter.onstart = () => {
        if (utterRef.current !== utter) return
        window.clearTimeout(timers.talk)
        setTalking(true)
        // Safety net: some speech engines occasionally drop the end event, which
        // would leave him mouthing forever. Stop after a generous estimate.
        timers.talk = window.setTimeout(() => {
          if (utterRef.current === utter) setTalking(false)
        }, Math.min(15000, 2000 + text.length * 90))
      }
      utter.onend = () => {
        if (utterRef.current === utter) setTalking(false)
      }
      utter.onerror = (event) => {
        if (utterRef.current !== utter) return
        if (event.error === 'interrupted' || event.error === 'canceled') setTalking(false)
        else mouthItSilently()
      }
      synth.speak(utter)
    } catch {
      mouthItSilently()
    }
  }, [])

  // Hide the balloon a while after a line, like the old agent balloons did.
  const scheduleHide = useCallback((text: string) => {
    const timers = timersRef.current
    window.clearTimeout(timers.hide)
    timers.hide = window.setTimeout(() => setShowBalloon(false), 3500 + text.length * 75)
  }, [])

  // Sprite look: show these frames in order, then call `then`. Starting a new
  // animation replaces the one running.
  const play = useCallback((steps: readonly SpriteStep[], then?: () => void) => {
    const timers = timersRef.current
    window.clearTimeout(timers.seq)
    busyRef.current = true
    const showFrame = (index: number) => {
      const step = steps[index]
      const last = index === steps.length - 1
      if (last) busyRef.current = false
      frameRef.current = step.frame
      setBaseFrame(step.frame)
      timers.seq = window.setTimeout(() => {
        if (!last) showFrame(index + 1)
        else then?.()
      }, step.ms)
    }
    // Deferred so a frame never changes synchronously inside an effect.
    timers.seq = window.setTimeout(() => showFrame(0), 0)
  }, [])

  // Bring his arms down first if they are open (or opening, or already closing),
  // then carry on with `then`. The close picks up from the frame on screen, so a
  // close already under way continues instead of starting over.
  const settle = useCallback(
    (then: () => void) => {
      const close = BONZI_ANIMS.explainOut
      const frame = frameRef.current
      const from = frame === BONZI_EXPLAIN_POSE ? 0 : close.findIndex((step) => step.frame === frame)
      if (frame === BONZI_REST || from < 0) then()
      else play(close.slice(from), then)
    },
    [play],
  )

  const say = useCallback(
    (text: string, nextMood: BonziMood) => {
      setThinking(false)
      setMood(nextMood)
      setBalloonText(text)
      setShowBalloon(true)
      lastLineRef.current = text
      lastActivityRef.current = Date.now()
      scheduleHide(text)
      speak(text)
      // The sprite Bonzi opens his arms for lively lines, like the original's
      // "explain" gesture, and closes them again once he stops talking.
      if (lookRef.current === 'sprite' && nextMood !== 'idle' && !busyRef.current && frameRef.current === BONZI_REST) {
        play(BONZI_ANIMS.explainIn)
      }
    },
    [play, scheduleHide, speak],
  )

  // A random spot on the desktop that keeps him off the chat window. Sampled
  // uniformly inside the valid area (sampling the whole desktop and then clamping
  // would pile most walks onto the bottom edge).
  const pickSpot = useCallback((): Point => {
    const { maxX, maxY, minY } = actorBounds(host)
    const randomSpot = (): Point => ({
      x: Math.round(Math.random() * maxX),
      y: Math.round(minY + Math.random() * (maxY - minY)),
    })
    const avoid = chatRectRef.current
    let target = randomSpot()
    for (let tries = 0; avoid && coversRect(target, avoid) && tries < 12; tries += 1) target = randomSpot()
    return target
  }, [host])

  // Go somewhere else on the desktop and remark on it. The sprite Bonzi swings
  // away on his vine and drops back in over there; the SVG one strolls across.
  const walkSomewhere = useCallback(() => {
    const target = pickSpot()
    const line = pickLine(BONZI_WANDER_LINES, Math.random, lastLineRef.current)
    const timers = timersRef.current
    if (lookRef.current === 'sprite') {
      window.clearTimeout(timers.hide)
      setShowBalloon(false)
      lastActivityRef.current = Date.now()
      settle(() =>
        play(BONZI_ANIMS.hide, () => {
          setActorPos(target)
          play(BONZI_ANIMS.show, () => say(line, 'idle'))
        }),
      )
      return
    }
    window.clearTimeout(timers.walk)
    setWalking(true)
    setActorPos(target)
    timers.walk = window.setTimeout(() => setWalking(false), 2600)
    say(line, 'wave')
  }, [pickSpot, play, say, settle])

  // Make his entrance once we know how he is drawn: the sprite Bonzi drops in on
  // his vine and waves before greeting; the SVG one waves while he says hello.
  // Opening the app was the user gesture that lets speech play.
  const begin = useCallback(
    (nextLook: 'sprite' | 'svg') => {
      if (lookRef.current !== 'pending') return
      lookRef.current = nextLook
      setLook(nextLook)
      lastActivityRef.current = Date.now()
      const greeting = lastLineRef.current
      if (nextLook === 'svg') {
        say(greeting, 'wave')
        return
      }
      play(BONZI_ANIMS.show, () =>
        play(BONZI_ANIMS.wave, () => {
          // Skip the hello if the visitor already got him talking meanwhile.
          if (lastLineRef.current === greeting) say(greeting, 'idle')
        }),
      )
    },
    [play, say],
  )

  // Find out whether the original character frames are installed (an optional
  // local asset, see data/bonziSprites.ts); without them he is the SVG figure.
  useEffect(() => {
    const probe = new Image()
    let decided = false
    const decide = (nextLook: 'sprite' | 'svg') => {
      if (decided) return
      decided = true
      begin(nextLook)
    }
    const giveUp = window.setTimeout(() => decide('svg'), ATLAS_TIMEOUT_MS)
    probe.onload = () => {
      window.clearTimeout(giveUp)
      decide('sprite')
    }
    probe.onerror = () => {
      window.clearTimeout(giveUp)
      decide('svg')
    }
    probe.src = BONZI_ATLAS_URL
    return () => {
      decided = true
      window.clearTimeout(giveUp)
      probe.onload = null
      probe.onerror = null
    }
  }, [begin])

  // Lip-sync: jump to a different mouth shape every few frames while he speaks.
  // When he stops, the mouth closes on its own (no overlay, or the SVG smile).
  useEffect(() => {
    if (!talking) return
    const timer = window.setInterval(() => {
      const roll = Math.floor(Math.random() * 6)
      setMouthSeed((seed) => (roll === seed ? (roll + 1) % 6 : roll))
    }, 130)
    return () => window.clearInterval(timer)
  }, [talking])

  // Idle blink every few seconds.
  useEffect(() => {
    let timer = 0
    const blinkStep = (index: number) => {
      const [stage, ms] = BLINK_STEPS[index]
      setBlink(stage)
      timer = window.setTimeout(index + 1 < BLINK_STEPS.length ? () => blinkStep(index + 1) : scheduleBlink, ms)
    }
    const scheduleBlink = () => {
      timer = window.setTimeout(() => blinkStep(0), 2600 + Math.random() * 3200)
    }
    scheduleBlink()
    return () => window.clearTimeout(timer)
  }, [])

  // Sprite look: close his arms a moment after he finishes a line (a new line
  // before then keeps them open).
  useEffect(() => {
    if (look !== 'sprite' || talking || baseFrame !== BONZI_EXPLAIN_POSE) return
    const timer = window.setTimeout(() => {
      if (!busyRef.current) play(BONZI_ANIMS.explainOut)
    }, EXPLAIN_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [look, talking, baseFrame, play])

  // After a stretch of silence he pipes up or wanders off: the signature
  // desktop-companion annoyance. "be quiet" in the chat turns it off.
  useEffect(() => {
    if (!chatter) return
    const timer = window.setInterval(() => {
      if (lookRef.current === 'pending' || busyRef.current || dragRef.current) return
      if (Date.now() - lastActivityRef.current < IDLE_MS) return
      if (Math.random() < 0.5) walkSomewhere()
      else say(pickLine(BONZI_CHATTER, Math.random, lastLineRef.current), 'wave')
    }, 2000)
    return () => window.clearInterval(timer)
  }, [chatter, say, walkSomewhere])

  // Dragging him around the desktop.
  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (!drag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      drag.moved = true
      lastActivityRef.current = Date.now()
      setActorPos(clampActor({ x: drag.base.x + dx, y: drag.base.y + dy }, host))
    }
    function onUp(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      if (drag.moved) suppressClickRef.current = true
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [host])

  // Keep him on screen if the browser window shrinks (the desktop clips overflow).
  useEffect(() => {
    function onResize() {
      setActorPos((current) => clampActor(current, host))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [host])

  // Leaving: stop every timer and any speech in progress.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      window.clearTimeout(timers.hide)
      window.clearTimeout(timers.reply)
      window.clearTimeout(timers.walk)
      window.clearTimeout(timers.effect)
      window.clearTimeout(timers.close)
      window.clearTimeout(timers.talk)
      window.clearTimeout(timers.seq)
      try {
        window.speechSynthesis?.cancel()
      } catch {
        // ignore
      }
    }
  }, [])

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    setWalking(false)
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, base: actorPos, moved: false }
  }

  function tickle() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    playSound('click')
    say(pickLine(BONZI_TICKLES, Math.random, lastLineRef.current), 'wave')
  }

  function onBonziContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    // Keep the desktop's own right-click menu from opening on top of him.
    event.preventDefault()
    event.stopPropagation()
    say(BONZI_NOT_A_MENU, 'wave')
  }

  function applyEffect(reply: BonziReply) {
    const timers = timersRef.current
    switch (reply.effect) {
      case 'search':
        timers.effect = window.setTimeout(() => openApp('internetExplorer'), 1200)
        break
      case 'quiet':
        setChatter(false)
        break
      case 'chatty':
        setChatter(true)
        break
      case 'byeWarn':
        byeArmedUntilRef.current = Date.now() + 30000
        break
      case 'bye':
        byeArmedUntilRef.current = 0
        timers.close = window.setTimeout(() => {
          if (lookRef.current !== 'sprite') {
            closeWindow(windowId)
            return
          }
          // The sprite Bonzi swings off on his vine, then the program exits.
          window.clearTimeout(timers.hide)
          setShowBalloon(false)
          settle(() => play(BONZI_ANIMS.hide, () => closeWindow(windowId)))
        }, 2800)
        break
      default:
        break
    }
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message) return
    setDraft('')
    const reply = bonziReply(message, {
      byeArmed: Date.now() < byeArmedUntilRef.current,
      lastLine: lastLineRef.current,
    })
    if (!reply) return
    const timers = timersRef.current
    window.clearTimeout(timers.hide)
    window.clearTimeout(timers.reply)
    lastActivityRef.current = Date.now()
    setThinking(true)
    setShowBalloon(true)
    timers.reply = window.setTimeout(() => {
      say(reply.text, reply.mood)
      applyEffect(reply)
    }, THINK_MS)
  }

  function onDraftKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  // Stand above every window (he is a desktop creature), but under dialogs,
  // menus and the taskbar.
  const topWindowZ = state.windows.reduce((max, item) => Math.max(max, item.zIndex), 20)
  const actorZ = Math.min(3999, topWindowZ + 1)
  const sprite = look === 'sprite'

  const actor = (
    <div
      className={`bonzi-actor desktop-companion ${sprite ? 'is-sprite' : ''} ${walking ? 'is-walking' : ''}`}
      style={{ transform: `translate(${actorPos.x}px, ${actorPos.y}px)`, zIndex: actorZ }}
    >
      {showBalloon && (
        <div className="bonzi-bubble" role="status" aria-live="polite">
          <p>{thinking ? '...' : balloonText}</p>
          <div className="bonzi-bubble-tail" />
        </div>
      )}
      <div
        className={sprite ? 'bonzi-gorilla' : `bonzi-gorilla is-${mood} ${talking ? 'is-talking' : ''}`}
        title="Bonzi: drag me around, or type to me in the chat box"
        onPointerDown={startDrag}
        onClick={tickle}
        onContextMenu={onBonziContextMenu}
      >
        {sprite ? (
          <BonziSprite base={baseFrame} overlay={spriteOverlay(baseFrame, talking, mouthSeed, blink)} />
        ) : (
          <BonziFigure blinking={blink > 0} mouthFrame={talking ? (mouthSeed % 3) + 1 : 0} />
        )}
      </div>
    </div>
  )

  return (
    <>
      <form className="bonzi-chat" onSubmit={send}>
        <p className="bonzi-chat-tagline">Now with AI&trade;</p>
        <textarea
          className="bonzi-chat-input"
          value={draft}
          placeholder="Send a message"
          aria-label="Send a message to Bonzi"
          rows={2}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onDraftKeyDown}
        />
        <button type="submit" className="bonzi-chat-send">
          Send
        </button>
        <div className="wip-banner">Work in Progress: simulation incomplete</div>
      </form>
      {/* Not drawn until we know which look he has, so he never flashes the wrong one. */}
      {look !== 'pending' && createPortal(actor, host ?? document.body)}
    </>
  )
}
