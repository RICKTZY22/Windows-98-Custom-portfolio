// Bonzi's "AI™": a scripted, keyword-driven chatbot, the way 1999 chat
// characters actually worked. No network, no model, no data leaves the page.
// A real language model would need a server holding an API key (a key shipped
// in browser code is exposed to anyone), so this static site keeps it scripted.

export type BonziMood = 'idle' | 'wave' | 'sing'
export type BonziEffect = 'search' | 'quiet' | 'chatty' | 'byeWarn' | 'bye'
export type BonziReply = { text: string; mood: BonziMood; effect?: BonziEffect }

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
] as const

export const BONZI_WANDER_LINES = [
  'Wheee! Just stretching my legs!',
  'La la la... walking walking walking...',
  'Ooh, I like this spot better!',
] as const

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

const QUESTION_FALLBACKS = [
  'Great question! The answer is... bananas!',
  'Let me check the whole Internet... it says maybe!',
  'Hmm, I would tell you, but it is a gorilla secret!',
] as const

export function pickLine(list: readonly string[], random: () => number = Math.random, avoid?: string): string {
  if (list.length <= 1) return list[0] ?? ''
  let choice = list[Math.floor(random() * list.length)] ?? list[0]
  // Avoid repeating the line Bonzi just said (bounded, so a fixed random() can't loop).
  for (let tries = 0; choice === avoid && tries < 8; tries += 1) {
    choice = list[(list.indexOf(choice) + 1) % list.length]
  }
  return choice
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9?\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatTime(now: Date): string {
  const hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${minutes} ${suffix}`
}

type BrainOptions = {
  now?: Date
  random?: () => number
  // True when the visitor already said bye once recently: the next bye closes.
  byeArmed?: boolean
  // The line Bonzi said last, so a pick doesn't immediately repeat it.
  lastLine?: string
}

/** Bonzi's reply to a chat message, or null for an empty message. */
export function bonziReply(input: string, options: BrainOptions = {}): BonziReply | null {
  const { now = new Date(), random = Math.random, byeArmed = false, lastLine } = options
  const text = normalize(input)
  if (!text) return null
  const has = (pattern: RegExp) => pattern.test(text)
  const pick = (list: readonly string[]) => pickLine(list, random, lastLine)

  if (has(/\b(bye|goodbye|good bye|see ya|see you later|cya|gotta go|farewell)\b/)) {
    return byeArmed
      ? { text: 'Fine! Bye bye, buddy! Do not forget me!', mood: 'wave', effect: 'bye' }
      : { text: 'Wait, do not go! Say bye again if you really mean it...', mood: 'idle', effect: 'byeWarn' }
  }
  if (has(/\b(be quiet|shut up|stop talking|quiet|silence|hush)\b/)) {
    return { text: 'Okay, okay! I will be quiet... mostly. Hehehe!', mood: 'idle', effect: 'quiet' }
  }
  if (has(/\b(talk to me|keep me company|chat with me|you can talk)\b/)) {
    return { text: 'Yay! I will keep you company!', mood: 'wave', effect: 'chatty' }
  }
  if (has(/\b(help|commands|what can you do|menu)\b/)) {
    return {
      text: 'Try: joke, sing, tip, search the web, what time is it, be quiet, or bye!',
      mood: 'wave',
    }
  }
  if (has(/\b(joke|jokes|funny|make me laugh)\b/)) return { text: pick(BONZI_JOKES), mood: 'wave' }
  if (has(/\b(sing|song|songs|music)\b/)) return { text: pick(BONZI_SONGS), mood: 'sing' }
  if (has(/\b(tip|tips|advice|trick)\b/)) return { text: pick(BONZI_TIPS), mood: 'idle' }
  if (has(/\b(search|google|internet|browse|surf|web)\b/)) {
    return { text: 'Let us surf the Web! Opening Internet Explorer for you!', mood: 'wave', effect: 'search' }
  }
  if (has(/\b(time|clock)\b/)) {
    return { text: `It is ${formatTime(now)}! Perfect time for a joke!`, mood: 'wave' }
  }
  if (has(/\b(weather|raining|sunny|snowing)\b/)) {
    return { text: 'It is always sunny on the desktop! Unless you change the wallpaper.', mood: 'idle' }
  }
  if (has(/\b(spyware|adware|virus|malware|tracking|track me|spying|spy)\b/)) {
    return { text: 'Spyware?! ME?! I would never! ...Why are you looking at me like that?', mood: 'idle' }
  }
  if (has(/\b(ai|chatgpt|robot|artificial|sentient|are you real|bot)\b/)) {
    return {
      text: 'I am a super advanced AI! ...Okay, I am a gorilla who reads keywords. Do not tell anyone.',
      mood: 'wave',
    }
  }
  if (has(/\b(your name|who are you|what are you)\b/)) {
    return { text: 'I am Bonzi! The smartest purple gorilla on the whole World Wide Web!', mood: 'wave' }
  }
  if (has(/\b(how are you|how r u|hows it going|how you doing)\b/)) {
    return { text: 'I am purple and fabulous! How about you, buddy?', mood: 'wave' }
  }
  if (has(/\b(love you|like you|best friend|bff)\b/)) {
    return { text: 'Aww! You are my best buddy too! Now tell all your friends to download me!', mood: 'wave' }
  }
  if (has(/\bloser\b/)) return { text: 'Takes one to know one! Hehehe!', mood: 'wave' }
  if (has(/\b(stupid|dumb|hate you|ugly|annoying|idiot)\b/)) {
    return { text: 'Hey! That hurts my purple feelings! ...I am still not leaving, though. Hehehe!', mood: 'idle' }
  }
  if (has(/\b(banana|bananas)\b/)) return { text: 'BANANA?! Where?! Gimme gimme gimme!', mood: 'sing' }
  if (has(/\b(thanks|thank you|thx|ty)\b/)) return { text: 'You are welcome, buddy!', mood: 'wave' }
  if (has(/\b(hi|hello|hey|hiya|howdy|yo|sup|whats up|greetings)\b/)) {
    return { text: pick(BONZI_GREETINGS), mood: 'wave' }
  }
  if (text.endsWith('?')) return { text: pick(QUESTION_FALLBACKS), mood: 'idle' }
  return { text: pick(FALLBACKS), mood: 'idle' }
}
