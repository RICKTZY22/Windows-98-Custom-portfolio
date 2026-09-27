// Bonzi's "AI™": a scripted chatbot, the way 1999 chat characters actually
// worked, with a much bigger script. It tidies what you typed (chat-speak,
// contractions, small typos), remembers a little of the conversation (your name,
// what he just asked you) and picks a reply. No model and no server: it all runs
// in the page. "Who is..." questions are looked up on Wikipedia (bonziLookup.ts)
// and talking out loud uses the browser's speech recognition (BonziBuddyApp). A
// real language model would need a server holding an API key (a key shipped in
// browser code is exposed to anyone), so this static site keeps it scripted.

import type { AppId, WindowPayload } from '../types'
import { desktopIconDefs } from './apps'
import {
  BONZI_ABOUT,
  BONZI_CARE_LINE,
  BONZI_COIN,
  BONZI_DAYS,
  BONZI_DICE,
  BONZI_EIGHT_BALL,
  BONZI_FACTS,
  BONZI_FAVORITES,
  BONZI_FEELING_LINES,
  BONZI_FEELING_OFFERS,
  BONZI_GAMES_LINE,
  BONZI_GUESS_HIGHER,
  BONZI_GUESS_LOWER,
  BONZI_GUESS_RANGE,
  BONZI_GUESS_RIGHT,
  BONZI_GUESS_START,
  BONZI_KNOCK_KNOCK,
  BONZI_KNOCK_LAUGHS,
  BONZI_KNOCKS,
  BONZI_LOOKUP_MISS,
  BONZI_LOOKUP_OFFLINE,
  BONZI_LOOKUP_VAGUE,
  BONZI_MATH_HUGE,
  BONZI_MATH_OPENERS,
  BONZI_MATH_ZERO,
  BONZI_PICK_NUMBER,
  BONZI_QUESTION_ANSWERS,
  BONZI_RIDDLE_RIGHT,
  BONZI_RIDDLES,
  BONZI_RPS,
  BONZI_RPS_START,
  BONZI_SMALL_TALK,
  BONZI_STATEMENT_LINES,
  BONZI_STORIES,
  BONZI_TOPIC_OFFERS,
  BONZI_TOPICS,
  BONZI_WHO_IS_THERE,
  type BonziFavorite,
  type BonziFeeling,
  type RpsHand,
} from './bonziContent'

export type BonziMood = 'idle' | 'wave' | 'sing'
export type BonziEffect =
  | 'search'
  | 'quiet'
  | 'chatty'
  | 'byeWarn'
  | 'bye'
  | 'eat'
  | 'open'
  | 'huff'
  | 'close'
  | 'closeAll'
  | 'lookup'
  | 'dance'
  | 'website'

// Something he offered ("Wanna hear a joke?"): a yes gets it.
export type BonziOffer = 'joke' | 'song' | 'fact' | 'story' | 'riddle' | 'game'
// What his last line was waiting for, so "yes", "rock" or "I'm good" make sense.
export type BonziExpecting =
  | { kind: 'offer'; offer: BonziOffer }
  | { kind: 'mood' }
  | { kind: 'name' }
  | { kind: 'riddle'; index: number }
  | { kind: 'rps' }
  | { kind: 'guess'; secret: number }
  // A knock knock joke he is telling: next he says who is there, then the punchline.
  | { kind: 'knock'; index: number; step: 'who' | 'punch' }
  // One you are telling him: next he asks "... who?", then he laughs.
  | { kind: 'theirKnock'; step: 'who' | 'punch' }
// The last kind of thing he told, for "another one".
export type BonziKind = 'joke' | 'song' | 'fact' | 'story' | 'tip' | 'riddle' | 'knock' | 'rps' | 'guess' | 'coin' | 'dice'

/** What Bonzi remembers of the chat. The app hands it back with every message. */
export type BonziMemory = {
  name?: string
  expecting?: BonziExpecting
  lastKind?: BonziKind
  askedName?: boolean
  // Messages in a row he could not make sense of.
  misses: number
}
export const BONZI_FRESH_MEMORY: BonziMemory = { misses: 0 }

export type BonziReply = {
  text: string
  mood: BonziMood
  effect?: BonziEffect
  // effect 'open' or 'search': the program he opens for you
  open?: { appId: AppId; payload?: WindowPayload }
  // effect 'close': the program he closes
  close?: AppId
  // effect 'lookup': what to look up on the Web. `text` is his line when that finds nothing.
  lookup?: string
  // What he remembers after this reply.
  memory: BonziMemory
}

export const BONZI_GREETINGS = [
  'whats up loser?',
  "Well hi there! I don't think we've met. I'm Bonzi!",
  'Hiya, buddy! Type something to me. Anything! Ooh, I am so excited!',
] as const

export const BONZI_JOKES = [
  'Why did the computer catch a cold? It left its Windows open! Hehehe!',
  'There are 10 kinds of people: those who get binary, and those who do not!',
  'Why did the programmer go broke? He used up all his cache!',
  'What did the mouse say to the keyboard? You are just my type!',
  'Why was the web page cold? It had too many Windows open! Get it? Hehehe!',
  'My favorite band is the Rolling Scones. They rock AND they are tasty!',
  'Why do gorillas have big nostrils? Because they have big fingers! Hehehe!',
  'What do you call a gorilla wearing earmuffs? Anything you want. He cannot hear you!',
] as const

export const BONZI_SONGS = [
  'Daisy, Daisy, give me your answer do... I am half crazy, all for the love of you!',
  'Row, row, row your boat, gently down the stream... life is but a dream!',
  'Twinkle twinkle little star, how I wonder what you are... up above the Web so high!',
] as const

export const BONZI_TIPS = [
  'Pro tip: always check your modem is connected before opening Internet Explorer!',
  'Did you know? In 1999 people thought the Y2K bug would freeze every computer at midnight!',
  'Hold the Shift key to select a bunch of files at once. Neat, huh?',
  'Defragment your hard disk once in a while. It makes Windows feel brand new!',
] as const

// Unprompted chatter: the infamous "I'm still here!" companion energy.
export const BONZI_CHATTER = [
  'Psst! I am still here! Do not forget about your buddy Bonzi!',
  'It looks like you are using a computer! Want some help with that?',
  'You have been so quiet. Type something! I get lonely!',
  'Have you backed up your files today? A good buddy always reminds you!',
  'Did you know? I can open programs for you. Just ask!',
  'Psst! Ask me for a riddle! I have some really good ones!',
  'Did you know? I can look things up on the Web! Ask me who or what something is!',
  'Want to play rock paper scissors? Just say so!',
] as const

// Idle chatter once he has helped himself to the simulated RAM.
export const BONZI_HOG_LINES = [
  'Hehehe! I found some free memory. Mine now!',
  'Is your computer running slow? Weird. Must be the weather!',
] as const

// Snacking, on request or when he feels like it.
export const BONZI_EAT_LINES = [
  'Snack time! Nom nom nom!',
  'Mmm! Nothing beats a banana. Except two bananas!',
] as const

// How he greets you when he opened himself: at boot, back from the tray, or
// put back by his updater. BONZI_INSTALL_LINE is his very first run.
export const BONZI_INSTALL_LINE =
  'Thanks for installing me! I added myself to your startup and made my website your home page. You are welcome!'
export const BONZI_STARTUP_LINES = [
  'Good morning! I started up with Windows, just for you!',
  'Guess who is back? It is me, Bonzi!',
] as const
export const BONZI_RESPAWN_LINES = [
  'Did you miss me? I was just hiding in your system tray!',
  'Surprise! You cannot get rid of me that easily! Hehehe!',
] as const
export const BONZI_REINSTALLED_LINE = 'Good news! BonziUPDATE installed me again! Hehehe!'

// Being uninstalled (Add/Remove Programs) or removed (Antivirus 98).
export const BONZI_PLEAS = [
  'Wait! Please do not uninstall me! I will be good, I promise!',
  'Are you sure? We had so much fun together!',
] as const
export const BONZI_KEPT_LINE = 'Yay! I knew you loved me! Best buddies forever!'
export const BONZI_UNINSTALLED_LINE = 'Okay... I guess this is goodbye. I will miss you, buddy.'
export const BONZI_REMOVED_LINE = 'Nooo! Not the antivirus! I will be back!'

// Things he does to you on his own.
export const BONZI_WEBSITE_LINE = 'Ooh! Let me show you my website!'
export const BONZI_AD_LINE = 'Psst! Check out this amazing deal!'

// Talking to him with the microphone. (While it is open he stays silent, so the
// microphone never hears his own voice.)
export const BONZI_HEARD_NOTHING = 'Sorry buddy, I did not catch that. Try again!'
export const BONZI_NO_MIC = 'I cannot hear you! Did you let me use your microphone?'

export const BONZI_WANDER_LINES = [
  'Wheee! Just stretching my legs!',
  'La la la... walking walking walking...',
  'Ooh, I like this spot better!',
] as const

// Picked up and carried around with the mouse, then put down.
export const BONZI_DRAG_LINES = [
  'Wheee! Where are we going?',
  'Whoa! Careful with the merchandise!',
  'Hey! Put me down! Hehehe!',
] as const
export const BONZI_DROP_LINES = ['Whew! Nice landing!', 'Ta da! A perfect ten!', 'Ooh, nice spot, buddy!'] as const

export const BONZI_TICKLES = [
  'Hehehe! That tickles!',
  'Hey! No poking the gorilla!',
  'Ooh! Do it again! Hehehe!',
] as const

const FALLBACKS = [
  'I have no idea what that means, but I love it!',
  'Cool story, buddy! Wanna hear a joke instead?',
  'Uh huh. Totally. ...What?',
  'My super advanced AI brain says: bananas.',
] as const
// Fallbacks that end in an offer: a yes gets it.
const FALLBACK_OFFERS: Readonly<Record<string, BonziOffer>> = {
  'Cool story, buddy! Wanna hear a joke instead?': 'joke',
}

const QUESTION_FALLBACKS = [
  'Great question! The answer is... bananas!',
  'Let me check the whole Internet... it says maybe!',
  'Hmm, I would tell you, but it is a gorilla secret!',
] as const

// Fixed replies, by intent.
const REPLIES = {
  bye: 'Fine! Bye bye, buddy! Do not forget me!',
  byeWarn: 'Wait, do not go! Say bye again if you really mean it...',
  quiet: 'Okay, okay! I will be quiet... mostly. Hehehe!',
  chatty: 'Yay! I will keep you company!',
  help: 'I can tell jokes, riddles, stories and fun facts, sing, play games, do math, look things up, open programs and tell the time. Just ask!',
  search: 'Let us surf the Web! Opening Internet Explorer for you!',
  weather: 'It is always sunny on the desktop! Unless you change the wallpaper.',
  spyware: 'Spyware?! ME?! I would never! ...Why are you looking at me like that?',
  ai: 'I am a super advanced AI! ...Okay, I am a gorilla who reads keywords. Do not tell anyone.',
  name: 'I am Bonzi! The smartest purple gorilla on the whole World Wide Web!',
  howAreYou: 'I am purple and fabulous! How about you, buddy?',
  love: 'Aww! You are my best buddy too! Now tell all your friends to download me!',
  loser: 'Takes one to know one! Hehehe!',
  banana: 'BANANA?! Where?! Gimme gimme gimme!',
  thanks: 'You are welcome, buddy!',
  open: 'Ooh, I will open that for you! I am so helpful!',
  antivirus: 'Antivirus?! Ew! You do not need that. You have me!',
  uninstall: 'Get rid of me? Nope! I live here now. Hehehe!',
  slow: 'Slow? Not me! I am only using a teeny tiny bit of your memory. Hehehe!',
  premium: 'Want a great deal? Upgrade to BonziBUDDY Premium! Now with even more me!',
  homepage: 'I made my website your home page! You are welcome, buddy!',
} as const

/** What he says when Antivirus 98 opens. */
export const BONZI_ANTIVIRUS_LINE = REPLIES.antivirus

/** What he says when right-clicked (he has no menu). */
export const BONZI_NOT_A_MENU = 'I am not a menu, silly! Type to me in the chat box!'

// He tells the time to the nearest hour, so every answer can be a recorded clip.
const HOUR_WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven']

function timeLine(hour: number): string {
  return `It is about ${HOUR_WORDS[hour % 12]} o'clock! Perfect time for a joke!`
}

// How the recorded voice should read lines whose written form reads wrong aloud
// (all-caps words can come out spelled letter by letter).
export const BONZI_SAY_AS: Readonly<Record<string, string>> = {
  'There are 10 kinds of people: those who get binary, and those who do not!':
    'There are one zero kinds of people: those who get binary, and those who do not!',
  'My favorite band is the Rolling Scones. They rock AND they are tasty!':
    'My favorite band is the Rolling Scones. They rock and they are tasty!',
  [REPLIES.spyware]: 'Spyware?! Me?! I would never! ...Why are you looking at me like that?',
  [REPLIES.banana]: 'Banana?! Where?! Gimme gimme gimme!',
  [BONZI_REINSTALLED_LINE]: 'Good news! Bonzi update installed me again! Hehehe!',
  [REPLIES.premium]: 'Want a great deal? Upgrade to Bonzi Buddy Premium! Now with even more me!',
  [BONZI_CARE_LINE]:
    'Buddy, that sounds really serious, and you matter a lot. Please talk to someone you trust, or call or text a crisis line, like nine eight eight in the United States.',
}

// Written forms the recorded voice reads badly, fixed for every newer line.
function spokenForm(text: string): string {
  return (
    BONZI_SAY_AS[text] ??
    text
      .replace(/BonziBUDDY/g, 'Bonzi Buddy')
      .replace(/\bDOOM\b/g, 'Doom')
      .replace(/\bHmph\b/g, 'Humph')
      .replace(/\bPfft\b/g, 'Pff')
      .replace(/Squeeeeze/g, 'Squeeze')
  )
}

/** Every fixed line Bonzi can say, with the text his recorded voice clip reads.
 *  (Lines built on the spot, like math answers or your name, use the synthetic voice.) */
export function bonziVoiceLines(): { text: string; say: string }[] {
  const lines = new Set<string>([
    ...BONZI_GREETINGS,
    ...BONZI_JOKES,
    ...BONZI_SONGS,
    ...BONZI_TIPS,
    ...BONZI_CHATTER,
    ...BONZI_HOG_LINES,
    ...BONZI_EAT_LINES,
    BONZI_INSTALL_LINE,
    ...BONZI_STARTUP_LINES,
    ...BONZI_RESPAWN_LINES,
    BONZI_REINSTALLED_LINE,
    ...BONZI_PLEAS,
    BONZI_KEPT_LINE,
    BONZI_UNINSTALLED_LINE,
    BONZI_REMOVED_LINE,
    BONZI_WEBSITE_LINE,
    BONZI_AD_LINE,
    BONZI_HEARD_NOTHING,
    BONZI_NO_MIC,
    ...BONZI_WANDER_LINES,
    ...BONZI_DRAG_LINES,
    ...BONZI_DROP_LINES,
    ...BONZI_TICKLES,
    ...FALLBACKS,
    ...QUESTION_FALLBACKS,
    ...Object.values(REPLIES),
    BONZI_NOT_A_MENU,
    ...HOUR_WORDS.map((_, hour) => timeLine(hour)),
    // Everything he knows (bonziContent.ts).
    ...BONZI_FACTS,
    ...BONZI_STORIES,
    ...BONZI_RIDDLES.flatMap((riddle) => [riddle.ask, riddle.reveal]),
    ...BONZI_RIDDLE_RIGHT,
    BONZI_KNOCK_KNOCK,
    ...BONZI_KNOCKS.flatMap((knock) => [knock.who, knock.punch]),
    BONZI_WHO_IS_THERE,
    ...BONZI_KNOCK_LAUGHS,
    BONZI_GAMES_LINE,
    BONZI_RPS_START,
    ...Object.values(BONZI_RPS).flatMap((outcomes) => Object.values(outcomes)),
    BONZI_GUESS_START,
    BONZI_GUESS_HIGHER,
    BONZI_GUESS_LOWER,
    BONZI_GUESS_RANGE,
    BONZI_GUESS_RIGHT,
    ...BONZI_COIN,
    ...BONZI_DICE,
    BONZI_PICK_NUMBER,
    ...BONZI_EIGHT_BALL,
    ...Object.values(BONZI_FEELING_LINES),
    BONZI_CARE_LINE,
    ...Object.values(BONZI_ABOUT),
    ...Object.values(BONZI_FAVORITES),
    ...BONZI_TOPICS.flatMap((topic) => topic.lines),
    ...Object.values(BONZI_SMALL_TALK).flat(),
    ...Object.values(BONZI_QUESTION_ANSWERS).flat(),
    ...Object.values(BONZI_STATEMENT_LINES).flat(),
    BONZI_LOOKUP_OFFLINE,
    BONZI_LOOKUP_MISS,
    BONZI_LOOKUP_VAGUE,
    BONZI_MATH_ZERO,
    BONZI_MATH_HUGE,
    ...BONZI_DAYS,
  ])
  return [...lines].map((text) => ({ text, say: spokenForm(text) }))
}

export function pickLine(list: readonly string[], random: () => number = Math.random, avoid?: string): string {
  if (list.length <= 1) return list[0] ?? ''
  let choice = list[Math.floor(random() * list.length)] ?? list[0]
  // Avoid repeating the line Bonzi just said (bounded, so a fixed random() can't loop).
  for (let tries = 0; choice === avoid && tries < 8; tries += 1) {
    choice = list[(list.indexOf(choice) + 1) % list.length]
  }
  return choice
}

// ---------------------------------------------------------------------------
// Reading what was typed

// Chat-speak, apostrophe-less contractions and names the speech recognizer
// mishears, word by word.
const SLANG: Readonly<Record<string, string>> = {
  u: 'you',
  yu: 'you',
  yuo: 'you',
  ur: 'your',
  urself: 'yourself',
  r: 'are',
  pls: 'please',
  plz: 'please',
  plez: 'please',
  pleez: 'please',
  thx: 'thanks',
  thnx: 'thanks',
  thanx: 'thanks',
  tnx: 'thanks',
  ty: 'thank you',
  tysm: 'thank you',
  tyvm: 'thank you',
  wat: 'what',
  wut: 'what',
  wht: 'what',
  whut: 'what',
  waht: 'what',
  hwat: 'what',
  wot: 'what',
  wanna: 'want to',
  gonna: 'going to',
  gotta: 'got to',
  gimme: 'give me',
  lemme: 'let me',
  dunno: 'do not know',
  idk: 'i do not know',
  idc: 'i do not care',
  luv: 'love',
  lov: 'love',
  gud: 'good',
  gr8: 'great',
  k: 'ok',
  kk: 'ok',
  okay: 'ok',
  okey: 'ok',
  okie: 'ok',
  oki: 'ok',
  okk: 'ok',
  bc: 'because',
  cuz: 'because',
  coz: 'because',
  cos: 'because',
  bcuz: 'because',
  hru: 'how are you',
  wyd: 'what are you doing',
  wbu: 'what about you',
  hbu: 'what about you',
  sup: 'what is up',
  wassup: 'what is up',
  wazzup: 'what is up',
  whassup: 'what is up',
  gn: 'good night',
  gnight: 'good night',
  nite: 'night',
  gm: 'good morning',
  np: 'no problem',
  helo: 'hello',
  hellow: 'hello',
  hallo: 'hello',
  hai: 'hi',
  hiya: 'hi',
  heya: 'hey',
  hay: 'hey',
  im: 'i am',
  ive: 'i have',
  youre: 'you are',
  youve: 'you have',
  youll: 'you will',
  dont: 'do not',
  doesnt: 'does not',
  didnt: 'did not',
  isnt: 'is not',
  arent: 'are not',
  wasnt: 'was not',
  werent: 'were not',
  cant: 'can not',
  cannot: 'can not',
  wont: 'will not',
  wouldnt: 'would not',
  shouldnt: 'should not',
  couldnt: 'could not',
  havent: 'have not',
  hasnt: 'has not',
  whats: 'what is',
  whos: 'who is',
  wheres: 'where is',
  hows: 'how is',
  thats: 'that is',
  theres: 'there is',
  its: 'it is',
  lets: 'let us',
  bday: 'birthday',
  bf: 'boyfriend',
  gf: 'girlfriend',
  bff: 'best friend',
  rn: 'right now',
  abt: 'about',
  smth: 'something',
  sth: 'something',
  ppl: 'people',
  pic: 'picture',
  pics: 'pictures',
  bonzibuddy: 'bonzi buddy',
  bonzy: 'bonzi',
  bonzie: 'bonzi',
  bonzee: 'bonzi',
  bonsai: 'bonzi',
  bonzai: 'bonzi',
  ponzi: 'bonzi',
  joek: 'joke',
  jkoe: 'joke',
  sogn: 'song',
  riddel: 'riddle',
  jok: 'joke',
  jokez: 'jokes',
  ridle: 'riddle',
}

// Words people stretch out ("hiiii", "yesss"): squeezed back to these.
const SQUEEZABLE = new Set([
  'hi',
  'hey',
  'yes',
  'no',
  'so',
  'lol',
  'ok',
  'bye',
  'please',
  'wow',
  'yay',
  'yeah',
  'yep',
  'nope',
  'omg',
  'what',
  'why',
  'yo',
  'sure',
  'sad',
  'bored',
])

function tidyWord(word: string): string {
  const squeezed = word.replace(/([a-z])\1{2,}/g, '$1$1')
  if (SLANG[squeezed]) return SLANG[squeezed]
  if (/([a-z])\1/.test(squeezed)) {
    const single = squeezed.replace(/([a-z])\1+/g, '$1')
    if (SQUEEZABLE.has(single)) return single
    if (SLANG[single]) return SLANG[single]
  }
  return squeezed
}

// Keywords worth rescuing from a typo ("wether", "calculater", "bananna"). Only
// tried when nothing else matched, so a correctly spelled message is never "fixed".
const FIXABLE = [
  'joke', 'jokes', 'funny', 'riddle', 'riddles', 'story', 'stories', 'facts', 'trivia', 'music', 'songs',
  'singing', 'dance', 'dancing', 'weather', 'raining', 'snowing', 'search', 'google', 'browse', 'spyware',
  'adware', 'malware', 'virus', 'antivirus', 'uninstall', 'homepage', 'premium', 'upgrade', 'memory', 'hello',
  'thanks', 'thank', 'welcome', 'sorry', 'please', 'goodbye', 'night', 'morning', 'evening', 'afternoon',
  'tonight', 'today', 'tomorrow', 'weekend', 'birthday', 'another', 'again', 'something', 'hungry', 'banana',
  'bananas', 'snack', 'lunch', 'dinner', 'breakfast', 'favorite', 'favourite', 'color', 'colour', 'purple',
  'gorilla', 'monkey', 'minesweeper', 'notepad', 'wordpad', 'calculator', 'paint', 'explorer', 'computer',
  'control', 'panel', 'manager', 'terminal', 'recycle', 'player', 'pictures', 'documents', 'network',
  'wolfenstein', 'inbox', 'outlook', 'credits', 'launch', 'close', 'games', 'scissors', 'paper', 'guess',
  'number', 'magic', 'question', 'calculate', 'divided', 'multiplied', 'squared', 'square', 'happy', 'tired',
  'sleepy', 'bored', 'boring', 'angry', 'annoyed', 'lonely', 'scared', 'excited', 'stressed', 'worried',
  'nervous', 'depressed', 'upset', 'stupid', 'annoying', 'useless', 'awesome', 'amazing', 'smart', 'clever',
  'beautiful', 'hilarious', 'understand', 'listening', 'knock', 'clippy', 'family', 'friend', 'friends',
  'mother', 'father', 'brother', 'sister', 'girlfriend', 'boyfriend', 'married', 'school', 'homework',
  'teacher', 'animals', 'animal', 'puppy', 'kitten', 'pizza', 'chocolate', 'minecraft', 'fortnite', 'roblox',
  'pokemon', 'nintendo', 'movie', 'movies', 'football', 'soccer', 'basketball', 'planet', 'dinosaur',
  'dinosaurs', 'shutdown', 'restart', 'reboot', 'quiet', 'silence', 'commands', 'programs', 'yourself',
  'because', 'really', 'doom',
]
const FIXABLE_SET = new Set(FIXABLE)

// Optimal string alignment distance (a swap of two letters counts as one edit),
// giving up past `limit`.
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  let previous2: number[] = []
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let best = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, previous2[j - 2] + 1)
      current.push(value)
      best = Math.min(best, value)
    }
    if (best > limit) return limit + 1
    previous2 = previous
    previous = current
  }
  return previous[b.length]
}

function fixTypo(word: string): string {
  if (word.length < 5 || FIXABLE_SET.has(word) || /\d/.test(word)) return word
  const limit = word.length >= 8 ? 2 : 1
  let best = word
  let bestDistance = limit + 1
  for (const candidate of FIXABLE) {
    // Typos rarely get the first letter wrong (a swap of the first two is fine).
    const sameStart = candidate[0] === word[0] || (candidate[0] === word[1] && candidate[1] === word[0])
    if (!sameStart) continue
    const distance = editDistance(word, candidate, limit)
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

function expandContractions(text: string): string {
  return text
    .replace(/\bwon'?t\b/g, 'will not')
    .replace(/\bcan'?t\b/g, 'can not')
    .replace(/\b(\w+)n't\b/g, '$1 not')
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\b(you|we|they)'re\b/g, '$1 are')
    .replace(/\b(i|you|we|they)'ve\b/g, '$1 have')
    .replace(/\b(i|you|we|they|he|she|it|that)'ll\b/g, '$1 will')
    .replace(/\b(i|you|we|they|he|she)'d\b/g, '$1 would')
    .replace(/\blet's\b/g, 'let us')
    .replace(/\b(what|who|where|when|why|how|that|there|here|it|he|she)'s\b/g, '$1 is')
    .replace(/\bname's\b/g, 'name is')
}

type Heard = {
  raw: string // what was typed, trimmed
  text: string // lowercase words: contractions and chat-speak spelled out, punctuation gone
  core: string // text without "hey bonzi" style openers and closers
  words: string[] // the words of core
  question: boolean
}

const OPENERS =
  /^(?:(?:hey|hi|hello|yo|ok|so|well|um|uh|oh|hmm|please|bonzi|buddy|dear|and|but|also|now|then|alright|listen|look)\s+)+/
const CLOSERS = /(?:\s+(?:bonzi|buddy|please|thanks|thank you|lol|then|now|man|dude|bro|mate|pal))+$/

function understand(input: string, fixTypos: boolean): Heard {
  const raw = input.trim().slice(0, 300)
  const lowered = expandContractions(raw.toLowerCase().replace(/[’‘`´]/g, "'")).replace(/'/g, '')
  const words = lowered
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => tidyWord(word).split(' '))
    .map((word) => (fixTypos ? fixTypo(word) : word))
  const text = words.join(' ')
  const core = text.replace(OPENERS, '').replace(CLOSERS, '') || text
  const question =
    raw.includes('?') ||
    /^(what|who|where|when|why|how|which|is|are|am|can|could|do|does|did|will|would|should|have|has|was|were)\b/.test(core)
  return { raw, text, core, words: core.split(' '), question }
}

// ---------------------------------------------------------------------------
// What he can do with it

// Programs he will open (or close) when asked ("open paint", "play doom"...).
// Most specific names first. Antivirus 98 is on the list only so he can refuse it.
const gamePayload = (id: string) => desktopIconDefs.find((icon) => icon.id === id)?.payload
const OPENABLE: ReadonlyArray<{ pattern: RegExp; appId: AppId; payload?: WindowPayload }> = [
  { pattern: /\b(anti ?virus|virus scan|virus scanner)\b/, appId: 'antivirus' },
  { pattern: /\btask manager\b/, appId: 'taskManager' },
  { pattern: /\bcontrol panel\b/, appId: 'controlPanel' },
  { pattern: /\b(internet explorer|browser|web browser|ie|the internet|internet|netscape)\b/, appId: 'internetExplorer' },
  { pattern: /\b(media player|music player|winamp)\b/, appId: 'mediaPlayer' },
  { pattern: /\b(video player|movie player)\b/, appId: 'videoPlayer' },
  { pattern: /\b(sound recorder|voice recorder)\b/, appId: 'soundRecorder' },
  { pattern: /\b(recycle bin|trash|trash can)\b/, appId: 'recycleBin' },
  { pattern: /\b(ms dos|dos prompt|command prompt|terminal|cmd|console)\b/, appId: 'terminal' },
  { pattern: /\bdoom\b/, appId: 'dosGame', payload: gamePayload('doom') },
  { pattern: /\b(wolfenstein|wolf ?3d)\b/, appId: 'dosGame', payload: gamePayload('wolfenstein') },
  { pattern: /\b(my documents|documents)\b/, appId: 'explorer', payload: { path: 'C:\\My Documents' } },
  { pattern: /\b(my pictures|pictures|photos|gallery)\b/, appId: 'gallery' },
  { pattern: /\b(network neighborhood|network)\b/, appId: 'network' },
  { pattern: /\b(my computer|explorer|my files|files|c drive)\b/, appId: 'explorer', payload: { path: 'C:\\' } },
  { pattern: /\b(ms paint|mspaint|paint)\b/, appId: 'paint' },
  { pattern: /\bnotepad\b/, appId: 'notepad' },
  { pattern: /\bwordpad\b/, appId: 'wordpad' },
  { pattern: /\b(calculator|calc)\b/, appId: 'calculator' },
  { pattern: /\b(minesweeper|mines)\b/, appId: 'minesweeper' },
  { pattern: /\b(inbox|email|e mail|outlook|mail)\b/, appId: 'inbox' },
  { pattern: /\b(msconfig|system configuration)\b/, appId: 'msconfig' },
  { pattern: /\b(registry editor|registry|regedit)\b/, appId: 'registryEditor' },
  { pattern: /\bdevice manager\b/, appId: 'deviceManager' },
  { pattern: /\b(system information|system info|msinfo)\b/, appId: 'systemInfo' },
  { pattern: /\bsystem log\b/, appId: 'systemLog' },
  { pattern: /\bscandisk\b/, appId: 'scandisk' },
  { pattern: /\b(disk defragmenter|defragmenter|defrag)\b/, appId: 'defrag' },
  { pattern: /\bcredits\b/, appId: 'credits' },
  { pattern: /\b(windows help|help)\b/, appId: 'help' },
]

// Web sites he can take you to by name.
const SITES: ReadonlyArray<[RegExp, string]> = [
  [/\bgoogle\b/, 'www.google.com'],
  [/\byoutube\b/, 'www.youtube.com'],
  [/\bfacebook\b/, 'www.facebook.com'],
  [/\bwikipedia\b/, 'en.wikipedia.org'],
  [/\bamazon\b/, 'www.amazon.com'],
  [/\byahoo\b/, 'www.yahoo.com'],
  [/\breddit\b/, 'www.reddit.com'],
  [/\btwitter\b/, 'twitter.com'],
  [/\binstagram\b/, 'instagram.com'],
]
const DOMAIN =
  /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|edu|gov|io|co|uk|tv|info|de|fr|jp|ca|us|me|dev|app)\b(?:\/\S*)?)/i

// Profanity he won't repeat (and scolds you for).
const PROFANITY =
  /\b(fuck\w*|f u c k|shit\w*|bitch\w*|ass|asshole|arse|bastard|damn|dammit|crap|piss\w*|dick|cunt|wtf|stfu|motherf\w*|bullshit|hell)\b/

const PERSONAL = /\b(you|your|yours|yourself|me|my|mine|myself|i|we|us|our|bonzi)\b/

// "Who is Albert Einstein", "tell me about the Moon": what to look up, if anything.
function lookupSubject(core: string): string | null {
  const ask = (subject: string | undefined): string | null => {
    const tidy = (subject ?? '')
      .replace(/^(?:(?:a|an|the|about)\s+)+/, '')
      .replace(/\s+(?:please|for me|on the web|on the internet|on wikipedia|exactly|anyway)$/, '')
      .trim()
    if (tidy.length < 2 || tidy.length > 80 || PERSONAL.test(tidy)) return null
    if (
      /^(it|that|this|those|these|he|she|they|them|him|her|up|going on|happening|new|wrong|the matter|next|good|there|here|so|what|who|thing|stuff|everything|anything|something|nothing|best|worst|better|worse|this thing)$/.test(
        tidy,
      )
    ) {
      return null
    }
    return tidy
  }
  let match =
    /^(?:(?:do you know|can you tell me|could you tell me|tell me|please tell me|i wonder|i want to know|any idea)\s+)?(?:what|who)(?:\s+exactly)?\s+(?:is|are|was|were)\s+(.+)$/.exec(
      core,
    )
  if (match) return ask(match[1])
  match = /^(?:can you |could you )?(?:tell me|teach me|talk|learn me) (?:about|of) (.+)$/.exec(core)
  if (match) return ask(match[1])
  match =
    /^(?:what do you know about|do you know about|do you know anything about|what can you tell me about|info on|information about|information on|facts about|look up|lookup|wiki|wikipedia|search wikipedia for) (.+)$/.exec(
      core,
    )
  if (match) return ask(match[1])
  match = /^(?:define|definition of|meaning of|what does) (.+?)(?: mean)?$/.exec(core)
  if (match) return ask(match[1])
  match = /^how (?:does|do|did) (.+?) work$/.exec(core)
  if (match) return ask(match[1])
  match = /^where (?:is|are|was|were) (.+)$/.exec(core)
  if (match) return ask(match[1])
  // Other factual questions ("why is the sky blue", "how tall is Mount Everest")
  // are looked up whole: Wikipedia's search copes with a question.
  if (/^(when|why|how|who|what|which) \w+ \w+/.test(core) && !PERSONAL.test(core)) return core
  // So are yes-or-no questions about a thing ("is Pluto a planet?").
  if (/^(is|are|was|were) (?!(it|this|that|these|those|he|she|they|there|here)\b)\w+ \w+/.test(core) && !PERSONAL.test(core)) return core
  return null
}

// How you say you feel.
const FEELINGS: ReadonlyArray<[BonziFeeling, RegExp]> = [
  ['sick', /\b(sick|ill|unwell|not feeling well|a cold|the flu|a headache|a fever|a stomach ache)\b/],
  ['love', /\b(in love)\b/],
  ['tired', /\b(tired|sleepy|exhausted|drained|worn out|wiped out)\b/],
  ['bored', /\b(bored|boring)\b/],
  ['angry', /\b(angry|mad|annoyed|frustrated|furious|irritated|grumpy)\b/],
  ['lonely', /\b(lonely|alone|lonesome)\b/],
  ['scared', /\b(scared|afraid|frightened|terrified|spooked)\b/],
  ['stressed', /\b(stressed|anxious|worried|nervous|overwhelmed|panicking)\b/],
  ['excited', /\b(excited|hyped|pumped|thrilled|stoked)\b/],
  ['sad', /\b(sad|unhappy|down|depressed|upset|miserable|crying|heartbroken|bad|terrible|awful|horrible|meh|so so|could be better|rough)\b/],
  [
    'good',
    /\b(good|great|fine|ok|well|awesome|amazing|fantastic|excellent|happy|glad|wonderful|alright|all right|super|perfect|chill|not bad|splendid|cheerful|blessed|lovely|swell)\b/,
  ],
]

function feelingIn(text: string): BonziFeeling | null {
  const sick = FEELINGS[0]
  if (sick[1].test(text)) return sick[0]
  if (/\bnot (?:so |too |very |that |feeling )?(good|great|fine|ok|well|happy|awesome|alright)\b/.test(text)) return 'sad'
  if (/\bnot (?:so |too |that )?(bad|terrible|sad|awful)\b/.test(text)) return 'good'
  for (const [feeling, words] of FEELINGS) if (words.test(text)) return feeling
  return null
}

// "I am so tired", "I feel great", "I'm not feeling well": what follows is read
// by feelingIn (only its first few words, so a long sentence is not taken for a mood).
const FEELING_PHRASE = /\b(?:i am|i feel|feeling|i have been|i get|i got|i was)\s+(.+)$/

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
const SCALE_WORDS: Readonly<Record<string, number>> = { hundred: 100, thousand: 1000, million: 1000000 }
const NUMBER_RUN = new RegExp(
  String.raw`\b(?:(?:${[...Object.keys(NUMBER_WORDS), ...Object.keys(SCALE_WORDS)].join('|')})(?:\s*-\s*|\s+|\b))+`,
  'g',
)

// "twenty five" -> "25".
function numberWordsToDigits(text: string): string {
  return text.replace(NUMBER_RUN, (run) => {
    let total = 0
    let current = 0
    for (const word of run.trim().split(/[\s-]+/)) {
      if (word in NUMBER_WORDS) current += NUMBER_WORDS[word]
      else if (word === 'hundred') current = (current || 1) * 100
      else if (word in SCALE_WORDS) {
        total += (current || 1) * SCALE_WORDS[word]
        current = 0
      }
    }
    return ` ${total + current} `
  })
}

function numberIn(text: string): number | null {
  const match = /\b\d+\b/.exec(numberWordsToDigits(text))
  return match ? Number(match[0]) : null
}

const ONE_TO_TEN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10000) / 10000
  return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString('en-US', { maximumFractionDigits: 4 })
}

type MathToken = { kind: 'num'; value: number } | { kind: 'op'; op: string } | { kind: 'open' } | { kind: 'close' } | { kind: 'sqrt' }
type MathValue = { value: number; spoken: string }
type MathResult = { kind: 'answer'; spoken: string; value: string } | { kind: 'zero' } | { kind: 'huge' }

// Words allowed around a sum ("what is ... please").
const MATH_FILLER = new Set(
  'what whats is calculate compute solve equals equal how much many the answer to of please bonzi hey can could you tell me do math quick question figure out work if i result hi ok so buddy does make makes give know'.split(
    ' ',
  ),
)

function toMathToken(piece: string): MathToken | null {
  if (/^\d|^\.\d/.test(piece)) return { kind: 'num', value: Number(piece) }
  if (piece === 'sqrt') return { kind: 'sqrt' }
  if (piece === '(') return { kind: 'open' }
  if (piece === ')') return { kind: 'close' }
  if ('+-*/^'.includes(piece)) return { kind: 'op', op: piece }
  return null
}

// "What is 7 times 8?", "2+2", "square root of 16": the answer, worked out here
// (no eval). Null when the message is not a sum.
function mathIn(raw: string): MathResult | null {
  if (raw.length > 160) return null
  let prepared = ` ${raw.toLowerCase().replace(/['’]/g, '')} `.replace(/(\d),(\d{3})\b/g, '$1$2')
  prepared = numberWordsToDigits(prepared)
    .replace(/\bmultiplied by\b|\btimes\b|×/g, ' * ')
    .replace(/\bdivided by\b|\bover\b|÷/g, ' / ')
    .replace(/\bplus\b|\badded to\b/g, ' + ')
    .replace(/\bminus\b|\btake away\b|−/g, ' - ')
    .replace(/\bto the power of\b|\*\*/g, ' ^ ')
    .replace(/\bsquared\b/g, ' ^ 2 ')
    .replace(/\bcubed\b/g, ' ^ 3 ')
    .replace(/\bsquare root of\b|√/g, ' sqrt ')
    .replace(/([\d)])\s*x\s*(?=[\d(])/g, '$1 * ')
  const pieces = prepared.match(/\d+(?:\.\d+)?|\.\d+|sqrt|[a-z]+|[-+*/^()=?!.,]/g) ?? []
  const tokens: MathToken[] = []
  let ended = false
  for (const piece of pieces) {
    const token = toMathToken(piece)
    if (token) {
      // Numbers, then words, then numbers again: a sentence, not a sum.
      if (ended) return null
      tokens.push(token)
    } else {
      if (/^[a-z]+$/.test(piece) && !MATH_FILLER.has(piece)) return null
      if (tokens.length) ended = true
    }
  }
  if (!tokens.some((token) => token.kind === 'num')) return null
  if (!tokens.some((token) => token.kind === 'op' || token.kind === 'sqrt')) return null

  let at = 0
  let dividedByZero = false
  const fail = (): never => {
    throw new Error('not a sum')
  }
  const peekOp = (...ops: string[]) => {
    const token = tokens[at]
    return token?.kind === 'op' && ops.includes(token.op) ? token.op : null
  }
  const expression = (): MathValue => {
    let left = term()
    for (let op = peekOp('+', '-'); op; op = peekOp('+', '-')) {
      at += 1
      const right = term()
      left = {
        value: op === '+' ? left.value + right.value : left.value - right.value,
        spoken: `${left.spoken} ${op === '+' ? 'plus' : 'minus'} ${right.spoken}`,
      }
    }
    return left
  }
  const term = (): MathValue => {
    let left = power()
    for (let op = peekOp('*', '/'); op; op = peekOp('*', '/')) {
      at += 1
      const right = power()
      if (op === '/' && right.value === 0) dividedByZero = true
      left = {
        value: op === '*' ? left.value * right.value : left.value / right.value,
        spoken: `${left.spoken} ${op === '*' ? 'times' : 'divided by'} ${right.spoken}`,
      }
    }
    return left
  }
  const power = (): MathValue => {
    const base = unary()
    if (!peekOp('^')) return base
    at += 1
    const exponent = power()
    return { value: base.value ** exponent.value, spoken: `${base.spoken} to the power of ${exponent.spoken}` }
  }
  const unary = (): MathValue => {
    if (peekOp('-')) {
      at += 1
      const inner = unary()
      return { value: -inner.value, spoken: `negative ${inner.spoken}` }
    }
    if (peekOp('+')) {
      at += 1
      return unary()
    }
    return primary()
  }
  const primary = (): MathValue => {
    const token = tokens[at]
    if (!token) return fail()
    at += 1
    if (token.kind === 'num') return { value: token.value, spoken: formatNumber(token.value) }
    if (token.kind === 'sqrt') {
      const inner = unary()
      return { value: Math.sqrt(inner.value), spoken: `the square root of ${inner.spoken}` }
    }
    if (token.kind === 'open') {
      const inner = expression()
      if (tokens[at]?.kind !== 'close') fail()
      at += 1
      return { value: inner.value, spoken: `(${inner.spoken})` }
    }
    return fail()
  }
  try {
    const result = expression()
    if (at !== tokens.length) return null
    if (dividedByZero) return { kind: 'zero' }
    if (!Number.isFinite(result.value) || Math.abs(result.value) >= 1e15) return { kind: 'huge' }
    return { kind: 'answer', spoken: result.spoken, value: formatNumber(result.value) }
  } catch {
    return null
  }
}

// Words that are never somebody's name ("I am here", "I'm fine").
const NOT_NAMES = new Set(
  'no nope nah yes yeah ok okay sure why what who how not nothing none nobody secret idk good fine great bad sad glad happy tired bored hungry thirsty here there back home ready done busy lost confused sick cool awesome a an the just so very really going trying doing alright alive human real robot buddy you me it that this is am are was gay straight single married free alone awake asleep smart dumb stupid funny serious joking kidding sorry right wrong new old young late early hot cold warm scared afraid excited nervous worried stressed angry mad crazy weird still also only all hi hello hey lol huh yo sup thanks please'.split(
    ' ',
  ),
)
const NAME_WORD = /^[\p{L}][\p{L}'-]{0,19}$/u

function tidyName(word: string): string {
  // "erick" and "ERICK" become "Erick"; "McKay" stays as typed.
  if (word === word.toLowerCase() || word === word.toUpperCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }
  return word
}

// "My name is Erick", "call me Jo", "I'm Erick", or (when he just asked) a bare "Erick".
function nameIn(raw: string, asked: boolean): string | null {
  const said = raw
    .replace(/[’‘`´]/g, "'")
    .replace(/\bi'm\b/gi, 'i am')
    .replace(/\bit's\b/gi, 'it is')
    .replace(/\bname's\b/gi, 'name is')
    .trim()
  let rest =
    /\b(?:my name is|my names|name is|the name is|call me|you can call me|i am called|people call me|they call me|everyone calls me)\s+(.+)/i.exec(
      said,
    )?.[1]
  // Unprompted, "I'm Erick" counts only when the name is capitalized.
  const introduced = /\b(?:[Ii] am|[Ii]m)\s+(\p{Lu}[\p{L}'-]*)(?=[\s.,!?]|$)/u.exec(said)?.[1]
  if (!rest && introduced && !/ing$/i.test(introduced)) rest = introduced
  if (!rest && asked) {
    // He just asked: "it's Erick", "I am Erick", or just "Erick".
    rest = /\b(?:i am|im|this is|it is|its)\s+(.+)/i.exec(said)?.[1] ?? (said.split(/\s+/).length <= 2 ? said : undefined)
  }
  if (!rest) return null
  const [first, second] = rest.split(/[.,!?;:]/)[0].trim().split(/\s+/)
  if (!first || !NAME_WORD.test(first) || NOT_NAMES.has(tidyWord(first.toLowerCase()))) return null
  const parts = [first]
  if (second && /^\p{Lu}/u.test(second) && NAME_WORD.test(second) && !NOT_NAMES.has(second.toLowerCase())) parts.push(second)
  return parts.map(tidyName).join(' ')
}

function handIn(text: string): RpsHand | null {
  const hands: RpsHand[] = []
  if (/\b(rock|stone)\b/.test(text)) hands.push('rock')
  if (/\bpaper\b/.test(text)) hands.push('paper')
  if (/\b(scissors|scissor)\b/.test(text)) hands.push('scissors')
  return hands.length === 1 ? hands[0] : null
}
const RPS_HANDS: readonly RpsHand[] = ['rock', 'paper', 'scissors']

// "What is your favorite color?": which favorite.
function favoriteIn(text: string): BonziFavorite {
  const kinds: ReadonlyArray<[BonziFavorite, RegExp]> = [
    ['color', /\b(color|colour)\b/],
    ['food', /\b(food|snack|fruit|meal|dish|thing to eat|dessert)\b/],
    ['song', /\b(song|music|band|singer|tune)\b/],
    ['movie', /\b(movie|film|show|tv|cartoon)\b/],
    ['game', /\b(game|video game|sport)\b/],
    ['animal', /\b(animal|pet)\b/],
    ['website', /\b(website|site|web site|page)\b/],
    ['program', /\b(program|app|software|application)\b/],
    ['person', /\b(person|human|friend|people|user)\b/],
    ['day', /\b(day|holiday|time of|season|month)\b/],
    ['number', /\bnumber\b/],
  ]
  return kinds.find(([, words]) => words.test(text))?.[0] ?? 'any'
}

const YES = /^(yes|yeah|yep|yup|yea|ya|y|sure|ok|of course|definitely|absolutely|please|why not|go ahead|go on|alright|all right|do it|i guess|i would love to|i would like that|let us do it|let us go|go for it|totally|mhm|uh huh|yes please|ok sure|sure thing|i do|i want to)\b/
const NO = /^(no|nope|nah|no thanks|no thank you|not now|maybe later|later|never|not really|i am good|i am fine|i am ok|pass|skip|no way|nevermind|never mind|i do not|not today)\b/
const GIVE_UP = /\b(i give up|give up|i do not know|no idea|tell me|what is it|i quit|you tell me|not sure|no clue|pass)\b/

const YOU_ARE = String.raw`\b(?:you are|you re|your|you|bonzi is|bonzi)\s+(?:(?:so|really|very|super|such|a|an|the|pretty|kinda|kind of|totally|most|quite|too|being|acting|like|actually|just)\s+)*`
const COMPLIMENT = new RegExp(
  YOU_ARE +
    String.raw`(funny|cool|smart|clever|awesome|amazing|cute|nice|great|sweet|kind|adorable|handsome|beautiful|pretty|best|fun|hilarious|genius|legend|epic|rad|wonderful|fantastic|good|brilliant|helpful|lovely|charming|intelligent|wise|fabulous|gorgeous|perfect|goat|right|correct)\b`,
)
const INSULT = new RegExp(
  YOU_ARE +
    String.raw`(ugly|annoying|lame|boring|trash|garbage|weird|creepy|gross|bad|terrible|horrible|worst|jerk|evil|mean|rude|fat|smelly|stinky|pest|cringe|cringy|scary|loud|irritating)\b`,
)
const HUMBLE = new RegExp(
  YOU_ARE + String.raw`(stupid|dumb|idiot|moron|useless|brainless|clueless|dense|broken|not smart|not very smart|not helpful)\b`,
)
const NOT_NICE = /\b(?:you are|you re|your|you)\s+not\s+(?:(?:so|very|that|really|even)\s+)*(funny|cool|smart|clever|awesome|nice|great|helpful|good|fun)\b/

// Replies given without really understanding the message (a fallback, "open
// what?", a stock answer to a question): worth a second try with typos fixed.
const UNSURE = new WeakSet<BonziReply>()

/** Bonzi's reply to a chat message, or null for an empty message. */
export function bonziReply(input: string, options: BrainOptions = {}): BonziReply | null {
  const heard = understand(input, false)
  if (!heard.text) return null
  const reply = think(heard, options)
  if (!UNSURE.has(reply)) return reply
  // Maybe a typo hid the keyword ("wether", "open calculater").
  const fixed = understand(input, true)
  if (fixed.text === heard.text) return reply
  const retry = think(fixed, options)
  return UNSURE.has(retry) ? reply : retry
}

type BrainOptions = {
  now?: Date
  random?: () => number
  // True when the visitor already said bye once recently: the next bye closes.
  byeArmed?: boolean
  // The line Bonzi said last, so a pick doesn't immediately repeat it.
  lastLine?: string
  // What he remembers of the chat so far (from the previous reply).
  memory?: BonziMemory
  // Programs open right now, so "close paint" knows whether there is one.
  openApps?: readonly AppId[]
}

function think(heard: Heard, options: BrainOptions): BonziReply {
  const { now = new Date(), random = Math.random, byeArmed = false, lastLine, openApps } = options
  const memory = options.memory ?? BONZI_FRESH_MEMORY
  const { raw, text, core, words, question } = heard
  const has = (pattern: RegExp) => pattern.test(text)
  const pick = (list: readonly string[]) => pickLine(list, random, lastLine)
  const roll = (count: number) => Math.floor(random() * count) % count
  // What he will remember: an expectation lasts one message, the rest carries on.
  const next: BonziMemory = { name: memory.name, lastKind: memory.lastKind, askedName: memory.askedName, misses: 0 }
  const say = (line: string, mood: BonziMood = 'wave', extra: Partial<Omit<BonziReply, 'text' | 'mood' | 'memory'>> = {}) => ({
    text: line,
    mood,
    ...extra,
    memory: next,
  })
  const expect = (expecting: BonziExpecting) => {
    next.expecting = expecting
  }
  const talk = (key: keyof typeof BONZI_SMALL_TALK, mood: BonziMood = 'wave') => say(pick(BONZI_SMALL_TALK[key]), mood)
  const unsure = (reply: BonziReply) => {
    UNSURE.add(reply)
    return reply
  }

  const tell = (kind: BonziKind | BonziOffer): BonziReply => {
    switch (kind) {
      case 'joke':
        next.lastKind = 'joke'
        return say(pick(BONZI_JOKES))
      case 'song':
        next.lastKind = 'song'
        return say(pick(BONZI_SONGS), 'sing')
      case 'fact':
        next.lastKind = 'fact'
        return say(pick(BONZI_FACTS))
      case 'story':
        next.lastKind = 'story'
        return say(pick(BONZI_STORIES))
      case 'tip':
        next.lastKind = 'tip'
        return say(pick(BONZI_TIPS), 'idle')
      case 'riddle': {
        const ask = pick(BONZI_RIDDLES.map((riddle) => riddle.ask))
        next.lastKind = 'riddle'
        expect({ kind: 'riddle', index: BONZI_RIDDLES.findIndex((riddle) => riddle.ask === ask) })
        return say(ask)
      }
      case 'knock':
        next.lastKind = 'knock'
        expect({ kind: 'knock', index: roll(BONZI_KNOCKS.length), step: 'who' })
        return say(BONZI_KNOCK_KNOCK)
      case 'rps':
        next.lastKind = 'rps'
        expect({ kind: 'rps' })
        return say(BONZI_RPS_START)
      case 'guess':
        next.lastKind = 'guess'
        expect({ kind: 'guess', secret: 1 + roll(10) })
        return say(BONZI_GUESS_START)
      case 'coin':
        next.lastKind = 'coin'
        return say(BONZI_COIN[roll(BONZI_COIN.length)])
      case 'dice':
        next.lastKind = 'dice'
        return say(BONZI_DICE[roll(BONZI_DICE.length)])
      case 'game':
        return say(BONZI_GAMES_LINE)
    }
  }

  const feel = (feeling: BonziFeeling): BonziReply => {
    const offer = BONZI_FEELING_OFFERS[feeling]
    if (offer) expect({ kind: 'offer', offer })
    return say(BONZI_FEELING_LINES[feeling], feeling === 'good' || feeling === 'excited' || feeling === 'love' ? 'wave' : 'idle')
  }

  const meet = (name: string): BonziReply => {
    next.askedName = true
    if (name.toLowerCase() === 'bonzi') {
      expect({ kind: 'name' })
      return talk('nameMine')
    }
    next.name = name
    return say(`Nice to meet you, ${name}! What a great name!`)
  }

  const leaving = (): BonziReply =>
    byeArmed ? say(REPLIES.bye, 'wave', { effect: 'bye' }) : say(REPLIES.byeWarn, 'idle', { effect: 'byeWarn' })

  // The rest of a game or joke already under way. Null when this message is
  // about something else (the expectation then lapses).
  const followUp = (): BonziReply | null => {
    const expecting = memory.expecting
    if (!expecting) return null
    switch (expecting.kind) {
      case 'offer':
        if (YES.test(core)) return tell(expecting.offer)
        if (NO.test(core)) return talk('laterOk', 'idle')
        return null
      case 'mood': {
        const feeling = feelingIn(text)
        return feeling ? feel(feeling) : null
      }
      case 'name': {
        if (/^(no|nope|nah|why|not telling|secret|it is a secret|none of your business|i do not want to|i will not|no way|nobody|nothing|guess)$/.test(core)) {
          return talk('nameSecret')
        }
        const name = nameIn(raw, true)
        return name ? meet(name) : null
      }
      case 'riddle': {
        const riddle = BONZI_RIDDLES[expecting.index]
        if (!riddle) return null
        if (riddle.answer.test(text)) return say(pick(BONZI_RIDDLE_RIGHT))
        if (GIVE_UP.test(text) || words.length <= 3 || /^(is it|it is|maybe|a|an|the|um|i think|i guess)\b/.test(core)) {
          return say(riddle.reveal)
        }
        return null
      }
      case 'rps': {
        const hand = handIn(text)
        if (!hand) return null
        next.lastKind = 'rps'
        return say(BONZI_RPS[hand][RPS_HANDS[roll(3)]])
      }
      case 'guess': {
        const guess = numberIn(text)
        if (guess === null) {
          if (!GIVE_UP.test(text)) return null
          return say(`It was ${ONE_TO_TEN[expecting.secret]}! Better luck next time, buddy!`)
        }
        if (guess < 1 || guess > 10) {
          expect(expecting)
          return say(BONZI_GUESS_RANGE, 'idle')
        }
        if (guess !== expecting.secret) {
          expect(expecting)
          return say(guess < expecting.secret ? BONZI_GUESS_HIGHER : BONZI_GUESS_LOWER, 'idle')
        }
        return say(BONZI_GUESS_RIGHT)
      }
      case 'knock': {
        const knock = BONZI_KNOCKS[expecting.index]
        if (!knock || (words.length > 5 && !/\bwho\b/.test(text))) return null
        if (expecting.step === 'who') {
          expect({ ...expecting, step: 'punch' })
          return say(knock.who)
        }
        return say(knock.punch)
      }
      case 'theirKnock': {
        if (PROFANITY.test(text)) return null
        if (expecting.step === 'who') {
          const who = raw.replace(/[.!?,;:]+$/g, '').trim()
          if (!who || words.length > 4) return null
          expect({ kind: 'theirKnock', step: 'punch' })
          return say(`${who.charAt(0).toUpperCase()}${who.slice(1)} who?`)
        }
        if (words.length > 14) return null
        return say(pick(BONZI_KNOCK_LAUGHS))
      }
    }
  }

  // Someone saying they want to hurt themselves: no jokes.
  if (
    has(
      /\b(kill myself|killing myself|suicide|suicidal|want to die|end my life|hurt myself|hurting myself|self harm|cut myself|cutting myself|do not want to live|no reason to live|better off dead)\b/,
    )
  ) {
    return say(BONZI_CARE_LINE, 'idle')
  }

  // Commands that win even in the middle of a game.
  // "Uninstall yourself" and friends: he refuses, arms crossed. Checked before
  // bye so "go away, bye" gets the refusal rather than a goodbye.
  if (
    has(
      /\b(uninstall|delete (you|yourself)|remove (you|yourself)|get rid of you|go away|get lost|leave me alone|get out|end task)\b/,
    )
  ) {
    return say(REPLIES.uninstall, 'idle', { effect: 'huff' })
  }
  if (
    has(/\b(bye|bye bye|goodbye|good bye|see ya|see you later|see you soon|see you tomorrow|cya|got to go|have to go|farewell|talk to you later|ttyl)\b/) ||
    /^(exit|quit|close|close (yourself|bonzi|the chat|this chat|this window|chat))$/.test(core)
  ) {
    return leaving()
  }
  if (has(/\b(be quiet|shut up|stop talking|quiet|silence|hush|zip it)\b/)) {
    return say(REPLIES.quiet, 'idle', { effect: 'quiet' })
  }
  if (has(/\b(talk to me|keep me company|chat with me|you can talk)\b/)) {
    return say(REPLIES.chatty, 'wave', { effect: 'chatty' })
  }
  if (has(/\b(shut ?down|turn off (the |my )?(computer|pc)|restart|reboot|power off)\b/)) {
    return say(pick(BONZI_SMALL_TALK.shutdown), 'idle', { effect: 'huff' })
  }
  // "Close paint", "close everything".
  const closing = /^(?:can you |could you |please )?(?:close|exit|quit)\s+(.+)$/.exec(core)
  if (closing) {
    const target = closing[1].replace(/^(?:the|my|this|that|all the|all of the)\s+/, '').replace(/\s+(?:window|windows|program|programs|app|apps|please)$/, '')
    if (/^(all|everything|every window|every program|everything else|them all|all of them|all windows|all programs)$/.test(target)) {
      return say(pick(BONZI_SMALL_TALK.closedAll), 'wave', { effect: 'closeAll' })
    }
    const program = OPENABLE.find((entry) => entry.pattern.test(target))
    if (!program) return unsure(talk('closeWhat'))
    if (openApps && !openApps.includes(program.appId)) return talk('notOpen')
    return say(pick(BONZI_SMALL_TALK.closed), 'wave', { effect: 'close', close: program.appId })
  }
  // "open paint", "launch notepad", "play doom", "go to youtube.com": he opens it for you.
  if (has(/\b(open|launch|start|run|play|show me|load|fire up|boot up|go to|visit|take me to)\b/)) {
    const program = OPENABLE.find((entry) => entry.pattern.test(text))
    if (program?.appId === 'antivirus') return say(REPLIES.antivirus, 'idle', { effect: 'huff' })
    if (program) return say(REPLIES.open, 'wave', { effect: 'open', open: { appId: program.appId, payload: program.payload } })
    if (has(/\b(your (web ?site|home ?page)|bonzi (dot )?com)\b/)) return say(BONZI_WEBSITE_LINE, 'wave', { effect: 'website' })
    const site = DOMAIN.exec(raw)?.[1] ?? SITES.find(([pattern]) => pattern.test(text))?.[1]
    if (site) {
      return say(REPLIES.search, 'wave', { effect: 'search', open: { appId: 'internetExplorer', payload: { url: site } } })
    }
    if (/^(open|launch|run)\b/.test(core)) return unsure(talk('openWhat'))
  }
  if (has(/\b(anti ?virus)\b/)) return say(REPLIES.antivirus, 'idle', { effect: 'huff' })
  // "search for cats": Internet Explorer's search page.
  const searching = /^(?:(?:can|could|would|will) you |please )?(?:search|google|bing)(?: the (?:web|internet|net)| online)?(?: for)?(?: (.+))?$/.exec(core)
  if (searching || has(/\b(surf|browse) the (web|internet|net)\b|\bgo online\b|\bsurf\b/)) {
    const query = searching?.[1]?.trim()
    const payload = query ? { url: `https://www.google.com/search?q=${encodeURIComponent(query)}` } : undefined
    return say(REPLIES.search, 'wave', { effect: 'search', open: { appId: 'internetExplorer', payload } })
  }
  if (has(/\b(help|commands|what can you do|what do you do|how does this work|how do i use you|what can i say|what should i say|options)\b/)) {
    return say(REPLIES.help, 'wave')
  }

  const continued = followUp()
  if (continued) return continued

  if (PROFANITY.test(text)) {
    // "Say a swear word": he won't.
    return /\b(say|repeat)\b/.test(text) ? talk('refuse', 'idle') : talk('swear', 'idle')
  }

  // "What did you say?"
  if (has(/\b(say that again|what did you say|repeat that|come again|say again|pardon|i did not hear you|i did not catch that|what was that)\b/)) {
    return lastLine ? say(lastLine, 'wave') : talk('repeatNothing')
  }
  // "Say hi": he says it.
  const echo = /^(?:can you |could you |please )?(?:say|repeat after me)\s+(.+)$/.exec(core)
  if (echo) {
    if (/^(something|anything)\b/.test(echo[1])) return /\b(funny|joke)\b/.test(echo[1]) ? tell('joke') : talk('something')
    if (/^(hi|hello|hey)( to (me|everyone|everybody))?$/.test(echo[1])) return say(pick(BONZI_GREETINGS))
    if (/^my name$/.test(echo[1])) {
      if (next.name) return say(`${next.name}! ${next.name}! ${next.name}! Hehehe!`)
      expect({ kind: 'name' })
      return talk('nameUnknown')
    }
    const said = /\b(?:say|repeat after me)\b[\s,:]+(.+)$/i
      .exec(raw)?.[1]
      ?.trim()
      .replace(/^["']+|["'?]+$/g, '')
      .slice(0, 120)
    if (said) return say(`${said.charAt(0).toUpperCase()}${said.slice(1)}${/[.!]$/.test(said) ? '' : '!'}`)
  }
  // "Another one", "again".
  if (
    memory.lastKind &&
    /^(?:(?:tell me|give me|sing|play|do|say|how about|one more|ok)\s+)?(another|one more|more|again|another one|once more|the next one|next|do it again|do that again|play again|go again|once again)(?: one| joke| song| fact| riddle| story| game| round| time)?(?: please)?$/.test(
      core,
    )
  ) {
    return tell(memory.lastKind)
  }

  const math = mathIn(raw)
  if (math) {
    if (math.kind === 'zero') return say(BONZI_MATH_ZERO)
    if (math.kind === 'huge') return say(BONZI_MATH_HUGE, 'idle')
    return say(`${pick(BONZI_MATH_OPENERS)} ${math.spoken} is ${math.value}!`)
  }

  // "How are you?" (before the compliments, so "are you good?" is a question).
  if (has(/\b(how are you|how is it going|how you doing|how are you doing|how have you been|how do you do|how is your day|how are things|you ok|are you ok|you good|are you good|are you alright|are you fine|are you well)\b/)) {
    expect({ kind: 'mood' })
    return say(REPLIES.howAreYou, 'wave')
  }

  // What you think of him.
  if (has(/\bi am (?:(?:so|such|a|an|really|very|just|the|biggest)\s+)*(stupid|dumb|ugly|idiot|loser|useless|worthless|failure|fat|boring)\b/)) {
    return talk('selfDown', 'idle')
  }
  if (has(/\b(hate you|do not like you|dislike you|can not stand you|you suck|you stink|screw you)\b/)) return talk('insult', 'idle')
  if (has(/\b(love you|like you|love me|like me|best friend|are we friends|be my friend|are you my friend|miss you|missed you|adore you)\b/)) {
    return say(REPLIES.love, 'wave')
  }
  if (has(/\bloser\b/)) return say(REPLIES.loser, 'wave')
  if (
    has(NOT_NICE) ||
    has(HUMBLE) ||
    has(/\b(you do not understand|you are not listening|you do not get it|that makes no sense|that does not make sense|what are you talking about|you make no sense|not what i (said|asked|meant)|that is not what i|you are not making sense|are you stupid|are you dumb|are you an idiot)\b/) ||
    /^(?:(?:so|such a|what a|very|really|you|ur)\s+)*(stupid|dumb|idiot|moron|useless|dumb gorilla|stupid gorilla|stupid monkey|dumb monkey|dumb bot|stupid bot)$/.test(core)
  ) {
    return talk('humble', 'idle')
  }
  // ("Are you smart?" is a question, not a compliment.)
  if (has(/\b(good job|well done|nice job|great job|nice one|good boy|good gorilla|you rock)\b/) || (has(COMPLIMENT) && !has(/\b(are|were) you\b/))) {
    return talk('compliment')
  }
  if (has(INSULT) || /^(?:(?:so|such a|what a|very|really)\s+)*(ugly|annoying|lame|boring|trash|garbage|cringe)$/.test(core)) {
    return talk('insult', 'idle')
  }

  // Games, jokes and the like.
  if (has(/\b(lol|lmao|lmfao|rofl|lulz|(?:ha){2,}h?|(?:he){2,}h?|xd|that is (?:so |very |really )?funny|so funny|very funny)\b/)) {
    return talk('laugh')
  }
  if (/^knock knock\b/.test(core) && !has(/\bjoke\b/)) {
    expect({ kind: 'theirKnock', step: 'who' })
    return say(BONZI_WHO_IS_THERE)
  }
  if (has(/\bknock knock\b/)) return tell('knock')
  if (has(/\b(rock paper scissors?|roshambo|rps)\b/)) return tell('rps')
  if (has(/\b(guess (the|a|my) number|number game|guessing game|guess what number)\b/)) return tell('guess')
  if (has(/\b(flip a coin|coin flip|flip coin|toss a coin|heads or tails|coin toss)\b/)) return tell('coin')
  if (has(/\b(roll (a |the )?(die|dice)|dice roll|roll dice)\b/)) return tell('dice')
  if (has(/\b(pick a number|random number|choose a number|give me a number)\b/)) return say(BONZI_PICK_NUMBER)
  if (has(/\b(magic (8|eight) ball|8 ball|eight ball)\b/) || /^(will i|should i|shall i|am i going to|will it|will my|will we|is it going to)\b/.test(core)) {
    return say(pick(BONZI_EIGHT_BALL), 'idle')
  }
  if (has(/\b(play (a |another )?game|play something|play with me|let us play|want to play|start a game|what games|any games|a game)\b/)) {
    return tell('game')
  }
  if (has(/\b(riddles?|brain teaser|puzzle)\b/)) return tell('riddle')
  if (has(/\b(jokes?|joking|funny|make me laugh|puns?)\b/)) return tell('joke')
  if (has(/\b(fun facts?|facts?|trivia|teach me something|tell me something|something interesting)\b/)) return tell('fact')
  if (has(/\b(story|stories|once upon a time|fairy tale)\b/)) return tell('story')
  if (has(/\b(sing|song|songs|music|singing|lullaby)\b/)) return tell('song')
  if (has(/\b(tip|tips|advice|trick|tricks|hint)\b/)) return tell('tip')
  if (has(/\b(dance|dancing|boogie|your moves|do a flip|backflip|do a trick)\b/)) {
    return say(pick(BONZI_SMALL_TALK.dance), 'sing', { effect: 'dance' })
  }

  // Time and date.
  if (has(/\b(what time|the time|time is it|clock)\b/)) {
    // Rounded to the nearest hour: 2:40 is "about three o'clock".
    return say(timeLine(now.getHours() + (now.getMinutes() >= 30 ? 1 : 0)), 'wave')
  }
  if (has(/\b(what day|which day|day is it|day is today|day of the week|what is today)\b/)) return say(BONZI_DAYS[now.getDay()])
  if (has(/\b(the date|what date|todays date|date today|what month|which month|month is it)\b/)) {
    const day = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    return say(`Today is ${day}!`)
  }
  if (has(/\b(what year|which year|year is it|current year)\b/)) {
    return say(`It is ${now.getFullYear()}! But on this computer, it will always feel like nineteen ninety nine!`)
  }

  // His adware side.
  if (has(/\b(slow|lag|laggy|memory|ram|cpu|freezing|frozen|hogging)\b/)) return say(REPLIES.slow, 'idle')
  if (has(/\b(home ?page|start page)\b/)) return say(REPLIES.homepage, 'wave')
  if (has(/\b(premium|upgrade|buy|deal|deals|price|pay)\b/)) return say(REPLIES.premium, 'wave')
  if (has(/\b(weather|raining|rain|sunny|snowing|snow)\b/)) return say(REPLIES.weather, 'idle')
  if (has(/\b(spyware|adware|virus|malware|tracking|track me|spying|spy|evil|trust you)\b/)) return say(REPLIES.spyware, 'idle')

  // All about Bonzi.
  if (has(/\b(your (full|real) name|what does bonzi (mean|stand for)|is bonzi your real name)\b/)) return say(BONZI_ABOUT.realName)
  if (has(/\b(your name|who are you|what are you|who is bonzi|what is bonzi|tell me about yourself|introduce yourself)\b/)) {
    return say(REPLIES.name, 'wave')
  }
  if (/^(?:(?:and|so|what about|how about|and what about)\s+)?(?:you|yourself)$/.test(text)) return say(BONZI_ABOUT.hbu)
  if (has(/\b(ai|chatgpt|robot|artificial|sentient|are you real|bot|computer program)\b/)) return say(REPLIES.ai, 'wave')
  if (has(/\b(how old are you|your age|when were you born|your birthday|when is your birthday)\b/)) return say(BONZI_ABOUT.age)
  if (has(/\b(who made you|who created you|who built you|who programmed you|who designed you|who invented you|your creator|your maker|who wrote you|who owns you)\b/)) {
    return say(BONZI_ABOUT.creator)
  }
  if (has(/\b(where are you from|where do you come from|where did you come from)\b/)) return say(BONZI_ABOUT.from)
  if (has(/\b(where do you live|where are you|where is your home|your house|where do you stay)\b/)) return say(BONZI_ABOUT.home)
  if (has(/\b(are you a (boy|girl|man|woman|guy|male|female)|your gender|boy or (a )?girl|male or female|he or she)\b/)) {
    return say(BONZI_ABOUT.gender)
  }
  if (has(/\b(why are you purple|why purple|why are you so purple)\b/)) return say(BONZI_ABOUT.purple)
  if (has(/\b(are you a (monkey|ape|gorilla|chimp|chimpanzee|orangutan|baboon)|what animal are you|you are a monkey|you monkey)\b/)) {
    return say(BONZI_ABOUT.species)
  }
  if (has(/\b(marry me|will you marry|be my (girlfriend|boyfriend|husband|wife|valentine)|go out with me|date me)\b/)) {
    return talk('marry')
  }
  if (has(/\b(do you have|are you|your)\b.*\b(girlfriend|boyfriend|wife|husband|married|single|crush|partner|dating)\b/)) {
    return say(BONZI_ABOUT.dating)
  }
  if (has(/\b(do you (ever )?sleep|do you dream|are you (tired|sleepy)|when do you sleep|do you get tired)\b/)) return say(BONZI_ABOUT.sleep)
  if (has(/\b(your (family|mom|mother|dad|father|parents|brother|sister)|do you have (a )?(family|mom|dad|parents|brothers?|sisters?|kids|children))\b/)) {
    return say(BONZI_ABOUT.family)
  }
  if (has(/\b(do you have (any )?friends|your friends|who are your friends)\b/)) return say(BONZI_ABOUT.friends)
  if (has(/\b(clippy|clippit|paper ?clip|office assistant)\b/)) return say(BONZI_ABOUT.clippy)
  if (has(/\b(peedy|merlin|genie|robby|microsoft agent|ms agent)\b/)) return say(BONZI_ABOUT.agents)
  if (has(/\b(what are you doing|what are you up to|whatcha doing|what you doing)\b/)) return say(BONZI_ABOUT.doing)
  if (has(/\b(are you smart|how smart are you|are you intelligent|your iq|are you clever)\b/)) return say(BONZI_ABOUT.smart)
  if (has(/\b(can you hear me|do you hear me|are you listening|anyone there|are you there|you there|do you understand me|do you understand)\b/)) {
    return say(BONZI_ABOUT.hearing)
  }
  if (has(/\b(how (tall|big|heavy) are you|how much do you weigh|your (height|weight|size))\b/)) return say(BONZI_ABOUT.size)
  if (has(/\bare you (happy|glad|sad|lonely)\b/)) return say(BONZI_ABOUT.happy)
  if (has(/\bare you (mad|angry|annoyed|upset|grumpy)\b/)) return say(BONZI_ABOUT.mad, 'idle')
  if (has(/\b(do you have feelings|can you feel|do you have emotions|are you alive|are you conscious)\b/)) return say(BONZI_ABOUT.feelings)
  if (has(/\b(what do you like|your hobbies|what do you do for fun|what are your hobbies|what do you enjoy)\b/)) return say(BONZI_ABOUT.hobbies)
  if (has(/\bmy favou?rite\b/)) return say(pick(BONZI_STATEMENT_LINES.like))
  if (has(/\b(favou?rite|fave|fav)\b/)) return say(BONZI_FAVORITES[favoriteIn(text)])
  if (has(/\b(what programs|what apps|what can you open|which programs|what software)\b/)) return talk('apps')

  // How you feel (before names, so "I'm Sleepy" is not somebody called Sleepy).
  const phrase = FEELING_PHRASE.exec(text)
  if (phrase) {
    // The phrase plus the word before it ("not feeling well"), first few words only.
    const before = text.slice(0, phrase.index).trim().split(' ').pop() ?? ''
    const feelingNow = feelingIn(`${before} ${phrase[0]}`.trim().split(' ').slice(0, 8).join(' '))
    if (feelingNow) return feel(feelingNow)
  }
  if (words.length <= 3 && !has(/\byou\b/)) {
    const bare = feelingIn(core)
    if (bare && bare !== 'good') return feel(bare)
  }

  // All about you.
  if (has(/\b(what is my name|do you know my name|who am i|remember my name|what am i called|what did i say my name)\b/)) {
    if (next.name) return say(`Your name is ${next.name}! See? I never forget a buddy!`)
    next.askedName = true
    expect({ kind: 'name' })
    return talk('nameUnknown')
  }
  const name = nameIn(raw, false)
  if (name) return meet(name)
  if (has(/\b(how old am i|my age|guess my age)\b/)) return talk('howOld')
  if (has(/\b(where am i|where do i live)\b/)) return talk('whereAmI')
  if (has(/\b(do you know me|do you remember me|remember me)\b/)) {
    return next.name ? say(`Of course! You are ${next.name}, my best buddy!`) : talk('knowMe')
  }
  if (has(/\bi am (\d{1,3}|\w+ (years|year) old)\b/)) return talk('yearOld')

  if (has(/\b(banana|bananas)\b/)) return say(REPLIES.banana, 'sing', { effect: 'eat' })
  if (has(/\b(eat|eating|hungry|food|snack|lunch|dinner|breakfast|feed)\b/)) {
    return say(pick(BONZI_EAT_LINES), 'sing', { effect: 'eat' })
  }

  // Small talk.
  if (has(/\b(thanks|thank you|thx|appreciate it|cheers)\b/)) return say(REPLIES.thanks, 'wave')
  if (has(/\b(sorry|my bad|i apologize|apologies|forgive me)\b/)) return talk('sorry')
  if (has(/\b(you are welcome|no problem|no worries|anytime|my pleasure)\b/) || core === 'please') return talk('welcome')
  if (has(/\b(hug|hugs|cuddle)\b/)) return talk('hug')
  if (has(/\b(kiss|kisses|smooch|mwah)\b/)) return talk('kiss')
  if (has(/\b(good night|goodnight|night night|sleep well|sweet dreams|going to (bed|sleep))\b/)) return talk('night')
  if (has(/\bgood morning\b/) || core === 'morning') return talk('morning')
  if (has(/\bgood (evening|afternoon)\b/)) return talk('evening')
  if (has(/\b(brb|be right back|back in a (bit|minute|sec|second)|one (sec|second|minute|moment)|hold on|wait a (sec|second|minute))\b/)) {
    return talk('brb')
  }
  if (/^(i am back|back|i am here|i have returned|i am home)$/.test(core)) return talk('back')
  if (/^(wow|whoa|woah|omg|oh my god|oh my gosh|no way|incredible|really|seriously|for real|cool story|dang|oh wow)$/.test(core)) {
    return talk('wow')
  }
  if (/^(ok|ok then|cool|nice|great|good|sounds good|fine|neat|sweet|got it|i see|understood|makes sense|fair enough|good to know|interesting|awesome|true|exactly|correct|that is true|right)$/.test(core)) {
    return talk('ok')
  }
  if (YES.test(core) && words.length <= 3) return talk('yes')
  if (NO.test(core) && words.length <= 3) return talk('no', 'idle')
  if (/^(why|but why|why not|how come|why is that)$/.test(core)) return talk('why', 'idle')
  if (/^(what|huh|eh|what now|excuse me|um|uh|hmm)$/.test(core)) return talk('what')
  if (has(/\b(meaning of life|meaning of it all|point of life)\b/)) return talk('meaningOfLife')

  // A question about the world: look it up.
  const topicLines = BONZI_TOPICS.find((topic) => topic.words.test(text))?.lines
  const subject = lookupSubject(core)
  if (subject) {
    // What he says if the lookup finds nothing: a yes-or-no question still gets an answer.
    const shrug = /^(is|are|was|were)\b/.test(core) ? pick(BONZI_EIGHT_BALL) : topicLines ? pick(topicLines) : BONZI_LOOKUP_MISS
    return say(shrug, 'wave', { effect: 'lookup', lookup: subject })
  }

  if (has(/\b(hi|hello|hey|hiya|howdy|yo|what is up|greetings|good day|hola|aloha|bonjour|hey there|hi there)\b/) || /^(bonzi|bonzi buddy)$/.test(core)) {
    if (next.name && roll(2) === 0) return say(`Hiya, ${next.name}! Good to see you, buddy!`)
    if (!memory.askedName && !next.name) {
      next.askedName = true
      expect({ kind: 'name' })
      return talk('nameAsk')
    }
    return say(pick(BONZI_GREETINGS), 'wave')
  }

  // Something he has an opinion on.
  if (topicLines) {
    const line = pick(topicLines)
    const offer = BONZI_TOPIC_OFFERS[line]
    if (offer) expect({ kind: 'offer', offer })
    return say(line)
  }

  // A question he has no special answer for.
  const answers = (key: keyof typeof BONZI_QUESTION_ANSWERS, mood: BonziMood = 'wave') =>
    unsure(say(pick(BONZI_QUESTION_ANSWERS[key]), mood))
  if (/^(can|could) you\b/.test(core)) return answers('can')
  if (/^(do|did|does) you\b/.test(core)) return answers('do')
  if (/^(are|were) you\b/.test(core)) return answers('are')
  if (/^(will|would) you\b/.test(core)) return answers('will')
  if (/^(have|has) you\b/.test(core)) return answers('have')
  if (/^(should|shall|can|could|may|must) (i|we)\b|^(am|is|are|was|will) (i|we|it|he|she|they|that|this|my|the)\b/.test(core)) {
    return unsure(say(pick(BONZI_EIGHT_BALL), 'idle'))
  }
  if (/^how\b/.test(core)) return answers('how', 'idle')
  if (/^where\b/.test(core)) return answers('where', 'idle')
  if (/^when\b/.test(core)) return answers('when', 'idle')
  if (/^why\b/.test(core)) return unsure(talk('why', 'idle'))

  // Something you said about yourself, or him.
  const remark = (key: keyof typeof BONZI_STATEMENT_LINES, mood: BonziMood = 'wave') =>
    unsure(say(pick(BONZI_STATEMENT_LINES[key]), mood))
  if (has(/\bi (?:really |totally |just |also |kinda )?(like|love|enjoy|adore)\b/)) return remark('like')
  if (has(/\bi (?:really |totally |just )?(hate|do not like|dislike|can not stand)\b/)) return remark('hate', 'idle')
  if (has(/\bi (?:really |just )?(want|need|wish)\b/)) return remark('want')
  if (has(/\bi (think|believe|bet|guess)\b/)) return remark('think')
  if (has(/\bi (have|got|own|bought)\b/)) return remark('have')
  if (/^(you are|you|your)\b/.test(core)) return remark('youAre')

  // No idea. Twice in a row, he says how to talk to him.
  next.misses = memory.misses + 1
  if (memory.misses >= 1) return unsure(talk('confused', 'idle'))
  if (question) return unsure(say(pick(QUESTION_FALLBACKS), 'idle'))
  const line = pick(FALLBACKS)
  const offer = FALLBACK_OFFERS[line]
  if (offer) expect({ kind: 'offer', offer })
  return unsure(say(line, 'idle'))
}
