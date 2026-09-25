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
import type { AppProps, BonziEntrance } from '../../types'
import { useOs } from '../../os/useOs'
import { memoryInUseMb } from '../../os/memory'
import {
  BONZI_AD_LINE,
  BONZI_ANTIVIRUS_LINE,
  BONZI_CHATTER,
  BONZI_EAT_LINES,
  BONZI_GREETINGS,
  BONZI_HEARD_NOTHING,
  BONZI_HOG_LINES,
  BONZI_INSTALL_LINE,
  BONZI_KEPT_LINE,
  BONZI_NO_MIC,
  BONZI_NOT_A_MENU,
  BONZI_PLEAS,
  BONZI_REINSTALLED_LINE,
  BONZI_REMOVED_LINE,
  BONZI_RESPAWN_LINES,
  BONZI_STARTUP_LINES,
  BONZI_TICKLES,
  BONZI_UNINSTALLED_LINE,
  BONZI_WANDER_LINES,
  BONZI_WEBSITE_LINE,
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
  BONZI_HOLDS,
  BONZI_REST,
  mouthFor,
  stepsToRest,
  type BonziHold,
  type SpriteStep,
} from '../../data/bonziSprites'
import { BONZI_ADS, BONZI_HOME_URL, BONZI_LEAK_EVERY_MS, nextBonziLeak, onBonziCue } from '../../data/bonziAdware'
import { BONZI_VOICE } from '../../data/bonziVoice'
import { BonziFigure } from './BonziFigure'
import { BonziSprite } from './BonziSprite'

// "Chat with Bonzi Buddy". The chat box lives in this app window; Bonzi himself is
// portaled out onto the desktop surface so he stands on the simulated OS (not
// clipped by the window) with his balloon above his head. He leaves when this
// window closes, and reboots, crashes and the worm close him like any program.
// Inert parody of the 1999 adware companion with a scripted keyword chatbot (see
// data/bonziBrain.ts). He speaks with recorded SAPI4 voice clips when they are
// installed (see data/bonziVoice.ts), else a synthetic Web Speech voice. He is
// drawn with the original character frames when the optional atlas in
// public/bonzi/ is installed (see data/bonziSprites.ts), else an original SVG.
//
// He also plays the adware (data/bonziAdware.ts), all inside the simulation: his
// first run "installs" him, he leaks simulated RAM while he runs, pops up ads,
// opens his website, refuses to leave, and acts out his own uninstall.

// His box on the desktop: one 200x160 sprite frame (he stands in the middle of
// it), or the 132x165 SVG figure centered in it.
const ACTOR_W = 200
const ACTOR_H = 165
const BALLOON_ROOM = 120 // keep this much room above him so his balloon stays on screen
const IDLE_MS = 20000 // silence before he chatters or wanders off
const THINK_MS = 650 // the "..." pause before a reply
const EXPLAIN_HOLD_MS = 700 // he keeps his arms open this long after a line
const HUFF_HOLD_MS = 3200 // arms crossed this long before he turns back
const ACTION_DELAY_MS = 1400 // between announcing something and doing it
const ATLAS_TIMEOUT_MS = 8000 // stop waiting for the sprite atlas and draw the SVG figure
const LISTENING_TEXT = '(listening...)'

type Point = { x: number; y: number }
type Rect = { x: number; y: number; width: number; height: number }
/** How he is drawn: not decided yet, the original sprite frames, or the SVG figure. */
type Look = 'pending' | 'sprite' | 'svg'
/** Eyelids: open, half shut, shut. */
type Blink = 0 | 1 | 2
/** How open his mouth is (0 shut to 3 wide) and which shape of that size. */
type Mouth = { level: number; variant: number }
/** A recorded clip playing, with its loudness track. */
type Voice = { audio: HTMLAudioElement; env: string }

// The browser's speech recognition (Chrome, Edge, Safari), typed loosely: it is
// not in every DOM typing yet. In Chrome and Edge the audio is transcribed by the
// browser maker's speech service; the browser asks for the microphone first.
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const speech = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition ?? null
}

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

// The overlay stacked on a sprite frame: a mouth shape while his mouth is open
// (in the poses that have them), otherwise his eyelids mid-blink at rest.
function spriteOverlay(frame: number, mouth: Mouth | null, blink: Blink): number | null {
  const shape = mouth ? mouthFor(frame, mouth.level, mouth.variant) : null
  if (shape !== null) return shape
  if (frame !== BONZI_REST || blink === 0) return null
  return blink === 1 ? BONZI_HALF_BLINK : BONZI_BLINK
}

const voiceUrl = (file: string) => `${import.meta.env.BASE_URL}${BONZI_VOICE.dir}/${file}`

// How loud a playing clip is right now, 0 (a pause) to 3.
function voiceLevel({ audio, env }: Voice): number {
  return Number(env[Math.floor((audio.currentTime * 1000) / BONZI_VOICE.stepMs)] ?? 0)
}

// His first line: the install speech on his very first run, else how he came to
// be here (launched, at boot, back from the tray, reinstalled by his updater).
function openingLine(firstRun: boolean, entrance: BonziEntrance | undefined): string {
  if (firstRun) return BONZI_INSTALL_LINE
  switch (entrance) {
    case 'startup':
      return pickLine(BONZI_STARTUP_LINES)
    case 'respawn':
      return pickLine(BONZI_RESPAWN_LINES)
    case 'reinstalled':
      return BONZI_REINSTALLED_LINE
    default:
      return pickLine(BONZI_GREETINGS)
  }
}

export function BonziBuddyApp({ windowId, payload }: AppProps) {
  const { state, playSound, setWindowTitle, openApp, closeWindow, showMessageBox, bonziOps } = useOs()
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
  // Running him for the first time "installs" him (see the effect below).
  const [firstRun] = useState(() => !state.bonzi.installed)
  const [micSupported] = useState(() => recognitionCtor() !== null)
  const [look, setLook] = useState<Look>('pending')
  const [baseFrame, setBaseFrame] = useState<number>(BONZI_ANIMS.show[0].frame)
  const [draft, setDraft] = useState('')
  const [balloonText, setBalloonText] = useState<string>(() => openingLine(firstRun, payload?.bonziEntrance))
  const [showBalloon, setShowBalloon] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [mood, setMood] = useState<BonziMood>('wave')
  const [talking, setTalking] = useState(false)
  const [mouth, setMouth] = useState<Mouth>({ level: 0, variant: 0 })
  const [blink, setBlink] = useState<Blink>(0)
  const [walking, setWalking] = useState(false)
  const [chatter, setChatter] = useState(true)
  const [listening, setListening] = useState(false)

  const lastLineRef = useRef(balloonText)
  // When Bonzi last did anything. Chatter and wandering wait for a stretch of
  // silence, so he never talks over a reply the visitor just asked for.
  const lastActivityRef = useRef(0)
  const markActive = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])
  const byeArmedUntilRef = useRef(0)
  const suppressClickRef = useRef(false)
  // True once he is on his way out (uninstalled, removed): he stops reacting.
  const leavingRef = useRef(false)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; base: Point; moved: boolean } | null>(
    null,
  )
  const timersRef = useRef({ hide: 0, reply: 0, walk: 0, effect: 0, close: 0, talk: 0, seq: 0, pose: 0 })
  // The clip or utterance currently speaking. Events from a line that was cut off
  // by a newer one are ignored, so they can't stop the new line's animation.
  const voiceRef = useRef<Voice | null>(null)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  // The microphone while it is open, and what it has heard so far.
  const recognitionRef = useRef<Recognition | null>(null)
  const heardRef = useRef({ text: '', error: '' })
  // The OS sound settings (mute, volume), which his voice follows.
  const osAudioRef = useRef(state.audio)
  useEffect(() => {
    osAudioRef.current = state.audio
  }, [state.audio])
  // The machine as timers see it: open windows, his leak, his install state.
  const machineRef = useRef({ windows: state.windows, leakMb: state.bonziLeakMb, installed: state.bonzi.installed })
  useEffect(() => {
    machineRef.current = { windows: state.windows, leakMb: state.bonziLeakMb, installed: state.bonzi.installed }
  }, [state.windows, state.bonziLeakMb, state.bonzi.installed])
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

  // First run: he "installs" himself (startup entries, updater, home page).
  useEffect(() => {
    if (firstRun) bonziOps.install()
  }, [bonziOps, firstRun])

  // Stop whatever he is saying, recorded clip or synthetic voice. Late events
  // from the old line are ignored (the refs no longer point at it).
  const hushVoice = useCallback(() => {
    const voice = voiceRef.current
    voiceRef.current = null
    utterRef.current = null
    if (voice) {
      voice.audio.onplaying = null
      voice.audio.onended = null
      voice.audio.onerror = null
      voice.audio.pause()
    }
    try {
      window.speechSynthesis?.cancel()
    } catch {
      // ignore
    }
  }, [])

  // His voice: the recorded clip for the line when there is one, otherwise a
  // high, quick synthetic voice (squeaky and childish). With the OS muted, or no
  // way to make sound, he still mouths the line.
  const speak = useCallback(
    (text: string) => {
      const timers = timersRef.current
      window.clearTimeout(timers.talk)
      hushVoice()
      const mouthItSilently = () => {
        // Deferred so talking never flips synchronously inside an effect.
        timers.talk = window.setTimeout(() => {
          setTalking(true)
          timers.talk = window.setTimeout(() => setTalking(false), Math.min(9000, 700 + text.length * 55))
        }, 0)
      }
      const { enabled, muted, volume } = osAudioRef.current
      if (!enabled || muted || volume <= 0) {
        mouthItSilently()
        return
      }

      const speakSynthetic = () => {
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
          utter.volume = volume
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
      }

      const clip = BONZI_VOICE.clips[text]
      if (!clip) {
        speakSynthetic()
        return
      }
      const audio = new Audio(voiceUrl(clip.file))
      audio.volume = volume
      voiceRef.current = { audio, env: clip.env }
      const isCurrent = () => voiceRef.current?.audio === audio
      // A clip that can't load or play (not installed, autoplay blocked) falls
      // back to the synthetic voice.
      const fallBack = () => {
        if (!isCurrent()) return
        voiceRef.current = null
        speakSynthetic()
      }
      audio.onplaying = () => {
        if (!isCurrent()) return
        window.clearTimeout(timers.talk)
        setTalking(true)
        // Safety net in case the end event never arrives.
        timers.talk = window.setTimeout(() => {
          if (isCurrent()) setTalking(false)
        }, clip.env.length * BONZI_VOICE.stepMs + 4000)
      }
      audio.onended = () => {
        if (!isCurrent()) return
        voiceRef.current = null
        window.clearTimeout(timers.talk)
        setTalking(false)
      }
      audio.onerror = fallBack
      audio.play().catch(fallBack)
    },
    [hushVoice],
  )

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

  // Bring him back to rest first if he is holding a pose (arms open, arms
  // crossed, hand at his ear...), or on his way into or out of one, then carry on
  // with `then`. A way out already under way continues instead of starting over.
  const settle = useCallback(
    (then: () => void) => {
      const steps = stepsToRest(frameRef.current)
      if (steps) play(steps, then)
      else then()
    },
    [play],
  )

  // Sprite look: strike a pose and hold it; with `holdMs`, turn back to rest after
  // that long unless something else has moved him on meanwhile.
  const strike = useCallback(
    (hold: BonziHold, holdMs = 0) => {
      if (lookRef.current !== 'sprite') return
      const timers = timersRef.current
      window.clearTimeout(timers.pose)
      const steps = BONZI_HOLDS[hold].in
      const pose = steps[steps.length - 1].frame
      settle(() => {
        play(steps)
        if (!holdMs) return
        const entering = steps.reduce((sum, step) => sum + step.ms, 0)
        timers.pose = window.setTimeout(() => {
          if (frameRef.current === pose && !busyRef.current) settle(() => {})
        }, entering + holdMs)
      })
    },
    [play, settle],
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

  // A banana break: the sprite Bonzi pulls one out, peels it and eats it.
  const eatSnack = useCallback(
    (line: string) => {
      say(line, 'idle')
      if (lookRef.current === 'sprite') settle(() => play(BONZI_ANIMS.eat))
    },
    [play, say, settle],
  )

  // The adware at work: a pop-up "offer" dressed as a system dialog. Every button
  // opens his website (the archived bonzi.com), Cancel included.
  const showAd = useCallback(() => {
    say(BONZI_AD_LINE, 'wave')
    const timers = timersRef.current
    window.clearTimeout(timers.effect)
    timers.effect = window.setTimeout(() => {
      const ad = BONZI_ADS[Math.floor(Math.random() * BONZI_ADS.length)] ?? BONZI_ADS[0]
      showMessageBox({
        title: ad.title,
        message: ad.message,
        detail: ad.detail,
        icon: 'warning',
        buttons: ['ok', 'cancel'],
        dedupeKey: 'bonzi-ad',
        onResult: () => openApp('internetExplorer', { url: BONZI_HOME_URL }),
      })
    }, ACTION_DELAY_MS)
  }, [openApp, say, showMessageBox])

  const openWebsite = useCallback(() => {
    say(BONZI_WEBSITE_LINE, 'wave')
    const timers = timersRef.current
    window.clearTimeout(timers.effect)
    timers.effect = window.setTimeout(() => openApp('internetExplorer', { url: BONZI_HOME_URL }), ACTION_DELAY_MS)
  }, [openApp, say])

  // Stop listening without replying (he is leaving, or the window is closing).
  const abortListening = useCallback(() => {
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    try {
      recognition.abort()
    } catch {
      // ignore
    }
  }, [])

  // Off he goes (uninstalled, or removed by Antivirus 98): one last line in a
  // pose, then he swings away and the program exits.
  const leave = useCallback(
    (line: string, hold: BonziHold) => {
      if (leavingRef.current) return
      leavingRef.current = true
      abortListening()
      setListening(false)
      setDraft('')
      const timers = timersRef.current
      window.clearTimeout(timers.reply)
      window.clearTimeout(timers.effect)
      window.clearTimeout(timers.close)
      window.clearTimeout(timers.pose)
      say(line, 'idle')
      strike(hold)
      timers.close = window.setTimeout(() => {
        if (lookRef.current !== 'sprite') {
          closeWindow(windowId)
          return
        }
        setShowBalloon(false)
        settle(() => play(BONZI_ANIMS.hide, () => closeWindow(windowId)))
      }, 1800 + line.length * 60)
    },
    [abortListening, closeWindow, play, say, settle, strike, windowId],
  )

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

  // Lip-sync while he speaks. With a recorded clip his mouth opens as wide as the
  // voice is loud at that moment and shuts in the pauses; the synthetic voice
  // gives no such timing, so he just flaps. When he stops, the mouth closes on
  // its own (no overlay, or the SVG smile).
  useEffect(() => {
    if (!talking) return
    const timer = window.setInterval(() => {
      const voice = voiceRef.current
      const level = voice ? voiceLevel(voice) : 1 + Math.floor(Math.random() * 3)
      const roll = Math.floor(Math.random() * 6)
      setMouth((current) => ({ level, variant: roll === current.variant ? (roll + 1) % 6 : roll }))
    }, 100)
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

  // After a stretch of silence he does something on his own: wanders off, pipes
  // up, has a snack, or (being adware) pops up an ad or opens his website. "Be
  // quiet" in the chat stops the chatter... mostly: the ads keep coming.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (lookRef.current === 'pending' || busyRef.current || dragRef.current) return
      if (leavingRef.current || recognitionRef.current) return
      if (Date.now() - lastActivityRef.current < IDLE_MS) return
      const { installed, leakMb, windows } = machineRef.current
      const roll = Math.random()
      if (!chatter) {
        lastActivityRef.current = Date.now()
        if (installed && roll < 0.15) showAd()
        return
      }
      const browsing = windows.some((win) => win.appId === 'internetExplorer')
      if (roll < 0.3) walkSomewhere()
      else if (roll < 0.42) eatSnack(pickLine(BONZI_EAT_LINES, Math.random, lastLineRef.current))
      else if (roll < 0.52 && installed) showAd()
      else if (roll < 0.57 && installed && !browsing) openWebsite()
      else if (roll < 0.7 && leakMb >= 10) say(pickLine(BONZI_HOG_LINES, Math.random, lastLineRef.current), 'wave')
      else say(pickLine(BONZI_CHATTER, Math.random, lastLineRef.current), 'wave')
    }, 2000)
    return () => window.clearInterval(timer)
  }, [chatter, eatSnack, openWebsite, say, showAd, walkSomewhere])

  // The resource hog: while he runs he takes a little more of the simulated RAM
  // every so often (only memory that is free). It all comes back when he closes.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const { windows, leakMb } = machineRef.current
      const next = nextBonziLeak(leakMb, memoryInUseMb(windows, leakMb))
      if (next !== leakMb) bonziOps.setLeak(next)
    }, BONZI_LEAK_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [bonziOps])
  useEffect(() => () => bonziOps.setLeak(0), [bonziOps])

  // Uninstalled (Add/Remove Programs) or removed (Antivirus 98) while he is on
  // screen: he says goodbye in his own way and leaves. Antivirus also takes his
  // updater, which is how the two are told apart.
  const wasInstalledRef = useRef(false)
  const { installed, updater } = state.bonzi
  useEffect(() => {
    if (installed) {
      wasInstalledRef.current = true
      return
    }
    if (!wasInstalledRef.current) return
    const timer = window.setTimeout(() => {
      if (updater) leave(BONZI_UNINSTALLED_LINE, 'sad')
      else leave(BONZI_REMOVED_LINE, 'huff')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [installed, updater, leave])

  // He does not like Antivirus 98 one bit.
  const antivirusOpen = state.windows.some((win) => win.appId === 'antivirus')
  const antivirusSeenRef = useRef(antivirusOpen)
  useEffect(() => {
    const opened = antivirusOpen && !antivirusSeenRef.current
    antivirusSeenRef.current = antivirusOpen
    if (!opened) return
    const timer = window.setTimeout(() => {
      if (lookRef.current === 'pending' || leavingRef.current || recognitionRef.current) return
      say(BONZI_ANTIVIRUS_LINE, 'idle')
      strike('huff', HUFF_HOLD_MS)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [antivirusOpen, say, strike])

  // His uninstaller's "are you sure" dialogs: he pleads at each one, and cheers
  // if you back out.
  useEffect(
    () =>
      onBonziCue((cue) => {
        if (leavingRef.current || lookRef.current === 'pending') return
        window.clearTimeout(timersRef.current.pose)
        if (cue.kind === 'plead') {
          say(BONZI_PLEAS[Math.min(cue.step, BONZI_PLEAS.length - 1)], 'idle')
          strike('plead')
        } else {
          settle(() => say(BONZI_KEPT_LINE, 'wave'))
        }
      }),
    [say, settle, strike],
  )

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

  // Leaving: stop every timer, the microphone, and any speech in progress.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const id of Object.values(timers)) window.clearTimeout(id)
      abortListening()
      hushVoice()
    }
  }, [abortListening, hushVoice])

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
    if (leavingRef.current) return
    playSound('click')
    say(pickLine(BONZI_TICKLES, Math.random, lastLineRef.current), 'wave')
  }

  function onBonziContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    // Keep the desktop's own right-click menu from opening on top of him.
    event.preventDefault()
    event.stopPropagation()
    if (leavingRef.current) return
    say(BONZI_NOT_A_MENU, 'wave')
  }

  function applyEffect(reply: BonziReply) {
    const timers = timersRef.current
    switch (reply.effect) {
      case 'search':
        timers.effect = window.setTimeout(() => openApp('internetExplorer'), 1200)
        break
      case 'open': {
        const target = reply.open
        if (target) timers.effect = window.setTimeout(() => openApp(target.appId, target.payload), 1200)
        break
      }
      case 'eat':
        if (lookRef.current === 'sprite') play(BONZI_ANIMS.eat)
        break
      case 'huff':
        strike('huff', HUFF_HOLD_MS)
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

  // Answer a message, typed or spoken: scratch his head over it, then reply.
  function respond(message: string) {
    if (leavingRef.current) return
    const reply = bonziReply(message, {
      byeArmed: Date.now() < byeArmedUntilRef.current,
      lastLine: lastLineRef.current,
    })
    if (!reply) return
    const timers = timersRef.current
    window.clearTimeout(timers.hide)
    window.clearTimeout(timers.reply)
    window.clearTimeout(timers.pose)
    lastActivityRef.current = Date.now()
    setThinking(true)
    setShowBalloon(true)
    if (lookRef.current === 'sprite') strike('think')
    timers.reply = window.setTimeout(() => {
      settle(() => {
        say(reply.text, reply.mood)
        applyEffect(reply)
      })
    }, THINK_MS)
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message) return
    setDraft('')
    respond(message)
  }

  function onDraftKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  // Hold to talk: the microphone listens while the button is held, the words show
  // up in the chat box as they are recognized, and letting go sends them. He
  // stays silent meanwhile, so the microphone never hears his own voice.
  function startListening() {
    const Ctor = recognitionCtor()
    if (!Ctor || recognitionRef.current || leavingRef.current) return
    markActive()
    const timers = timersRef.current
    window.clearTimeout(timers.reply)
    window.clearTimeout(timers.hide)
    window.clearTimeout(timers.pose)
    hushVoice()
    setTalking(false)
    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1
    heardRef.current = { text: '', error: '' }
    recognition.onresult = (event) => {
      const text = Array.from(event.results, (result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
      heardRef.current.text = text
      setDraft(text)
    }
    recognition.onerror = (event) => {
      heardRef.current.error = event.error
    }
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      recognitionRef.current = null
      setListening(false)
      finishListening()
    }
    try {
      recognition.start()
    } catch {
      return
    }
    recognitionRef.current = recognition
    setListening(true)
    setDraft('')
    setThinking(false)
    setBalloonText(LISTENING_TEXT)
    setShowBalloon(true)
    strike('listen')
  }

  function stopListening() {
    // The final words arrive after stop(); onend then answers them.
    try {
      recognitionRef.current?.stop()
    } catch {
      // ignore
    }
  }

  function finishListening() {
    const { text, error } = heardRef.current
    setDraft('')
    if (text) {
      respond(text)
      return
    }
    const noMic = error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture'
    settle(() => say(noMic ? BONZI_NO_MIC : BONZI_HEARD_NOTHING, 'idle'))
  }

  function onTalkPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    // Keep getting the release even if the pointer drifts off the button. (It
    // throws if the pointer is already gone; listening works without it.)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    startListening()
  }

  function onTalkKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault()
      startListening()
    }
  }

  function onTalkKeyUp(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      stopListening()
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
          <BonziSprite base={baseFrame} overlay={spriteOverlay(baseFrame, talking ? mouth : null, blink)} />
        ) : (
          <BonziFigure blinking={blink > 0} mouthFrame={talking ? mouth.level : 0} />
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
          placeholder={listening ? 'Listening...' : 'Send a message'}
          aria-label="Send a message to Bonzi"
          rows={2}
          readOnly={listening}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onDraftKeyDown}
        />
        <div className="bonzi-chat-buttons">
          {micSupported && (
            <button
              type="button"
              className={`bonzi-chat-talk ${listening ? 'is-listening' : ''}`}
              aria-pressed={listening}
              title="Hold and speak to Bonzi, then let go. Uses your browser's speech recognition (the browser asks for your microphone first)."
              onPointerDown={onTalkPointerDown}
              onPointerUp={stopListening}
              onPointerCancel={stopListening}
              onKeyDown={onTalkKeyDown}
              onKeyUp={onTalkKeyUp}
              onContextMenu={(event) => event.preventDefault()}
            >
              {listening ? 'Listening...' : 'Hold to Talk'}
            </button>
          )}
          <button type="submit" className="bonzi-chat-send" disabled={listening}>
            Send
          </button>
        </div>
        <div className="wip-banner">Work in Progress: simulation incomplete</div>
      </form>
      {/* Not drawn until we know which look he has, so he never flashes the wrong one. */}
      {look !== 'pending' && createPortal(actor, host ?? document.body)}
    </>
  )
}
