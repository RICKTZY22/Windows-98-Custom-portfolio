import './BonziBuddyApp.css'
import { useEffect, useState } from 'react'
import type { AppProps } from '../../types'
import { useOs } from '../../os/useOs'

const JOKES = [
  'Why did the computer catch a cold? Because it left its Windows open! Hehehe!',
  'There are 10 types of people in the world: those who understand binary, and those who do not!',
  'Why did the developer go broke? Because he used up all his cache!',
  'Why was the JavaScript developer wearing glasses? Because he did not C#!',
  'What did the mouse say to the keyboard? You are just my type!',
]

const SONGS = [
  'Daisy, Daisy, give me your answer do... I am half crazy, all for the love of you!',
  'Row, row, row your boat, gently down the stream... merrily merrily merrily, life is but a dream!',
  'Twinkle twinkle little star, how I wonder what you are... up above the World Wide Web so high!',
]

const TIPS = [
  'Did you know? In 1999, millions of people feared the Y2K bug would shut down power grids at midnight!',
  'Surfing the Web tip: Remember to bookmark your favorite websites on the Netscape Navigator toolbar!',
  'Always make sure your dial-up modem is connected before launching Internet Explorer 5.0!',
]

export function BonziBuddyApp({ windowId }: AppProps) {
  const { playSound, setWindowTitle } = useOs()
  const [speech, setSpeech] = useState('Hello there, friend! I am Bonzi! Welcome to Windows 98!')
  const [action, setAction] = useState<'idle' | 'wave' | 'sing'>('wave')

  useEffect(() => {
    setWindowTitle(windowId, 'BonziBuddy 1999 Desktop Assistant')
  }, [setWindowTitle, windowId])

  function tellJoke() {
    playSound('tada')
    setAction('wave')
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)]
    setSpeech(joke)
  }

  function singSong() {
    playSound('tada')
    setAction('sing')
    const song = SONGS[Math.floor(Math.random() * SONGS.length)]
    setSpeech(song)
  }

  function giveTip() {
    playSound('error')
    setAction('idle')
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)]
    setSpeech(tip)
  }

  return (
    <div className="bonzi-app">
      <div className="bonzi-stage">
        <div className="bonzi-bubble" aria-live="polite">
          <p>{speech}</p>
          <div className="bonzi-bubble-tail" />
        </div>

        <div className={`bonzi-gorilla is-${action}`} aria-hidden="true">
          {/* Retro Pixel Art SVG Bonzi Mascot */}
          <svg width="90" height="90" viewBox="0 0 100 100">
            {/* Body */}
            <ellipse cx="50" cy="65" rx="35" ry="30" fill="#753a88" />
            <ellipse cx="50" cy="67" rx="24" ry="20" fill="#e8c89b" />
            {/* Head */}
            <circle cx="50" cy="38" r="28" fill="#753a88" />
            <ellipse cx="50" cy="44" rx="22" ry="16" fill="#e8c89b" />
            {/* Ears */}
            <circle cx="24" cy="34" r="8" fill="#753a88" />
            <circle cx="24" cy="34" r="5" fill="#e8c89b" />
            <circle cx="76" cy="34" r="8" fill="#753a88" />
            <circle cx="76" cy="34" r="5" fill="#e8c89b" />
            {/* Eyes */}
            <ellipse cx="42" cy="34" rx="5" ry="7" fill="#ffffff" />
            <circle cx="43" cy="34" r="3" fill="#000000" />
            <ellipse cx="58" cy="34" rx="5" ry="7" fill="#ffffff" />
            <circle cx="57" cy="34" r="3" fill="#000000" />
            {/* Smile / Mouth */}
            <path d="M 40 48 Q 50 56 60 48" stroke="#000000" strokeWidth="2.5" fill="none" />
            {/* Nose */}
            <ellipse cx="50" cy="42" rx="4" ry="2.5" fill="#502560" />
          </svg>
        </div>
      </div>

      <div className="bonzi-controls">
        <button type="button" onClick={tellJoke}>
          Tell a Joke
        </button>
        <button type="button" onClick={singSong}>
          Sing a Song
        </button>
        <button type="button" onClick={giveTip}>
          Web Surfing Tip
        </button>
      </div>

      <div className="bonzi-footer">
        <span>BONZIBUDDY™ - Your Interactive Cyber Companion (1999)</span>
      </div>
    </div>
  )
}
