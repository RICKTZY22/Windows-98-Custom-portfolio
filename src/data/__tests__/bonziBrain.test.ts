import { describe, expect, it } from 'vitest'
import {
  BONZI_FRESH_MEMORY,
  BONZI_JOKES,
  BONZI_NOT_A_MENU,
  BONZI_SAY_AS,
  bonziReply,
  bonziVoiceLines,
  pickLine,
  type BonziMemory,
  type BonziReply,
} from '../bonziBrain'
import {
  BONZI_CARE_LINE,
  BONZI_FEELING_LINES,
  BONZI_GUESS_HIGHER,
  BONZI_GUESS_LOWER,
  BONZI_GUESS_RIGHT,
  BONZI_KNOCK_LAUGHS,
  BONZI_KNOCKS,
  BONZI_MATH_ZERO,
  BONZI_RIDDLE_RIGHT,
  BONZI_RIDDLES,
  BONZI_RPS,
  BONZI_SMALL_TALK,
  BONZI_WHO_IS_THERE,
} from '../bonziContent'

// Plays a conversation through the brain, carrying his memory along.
function chat(messages: string[], options: Parameters<typeof bonziReply>[1] = {}): BonziReply[] {
  let memory: BonziMemory = BONZI_FRESH_MEMORY
  let lastLine: string | undefined
  return messages.map((message) => {
    const reply = bonziReply(message, { ...options, memory, lastLine })
    if (!reply) throw new Error(`no reply to ${message}`)
    memory = reply.memory
    lastLine = reply.text
    return reply
  })
}

describe('bonzi brain (scripted chat)', () => {
  const first = () => 0

  it('ignores empty messages', () => {
    expect(bonziReply('   ')).toBeNull()
  })

  it('routes chat commands to the right intent', () => {
    expect(BONZI_JOKES).toContain(bonziReply('tell me a joke', { random: first })?.text)
    expect(bonziReply('sing me a song')?.mood).toBe('sing')
    expect(bonziReply('can you search the web?')?.effect).toBe('search')
    expect(bonziReply('please be quiet')?.effect).toBe('quiet')
    expect(bonziReply('talk to me')?.effect).toBe('chatty')
  })

  it('opens programs when asked, but never the antivirus', () => {
    expect(bonziReply('open paint')?.open?.appId).toBe('paint')
    expect(bonziReply('can you launch notepad please')?.open?.appId).toBe('notepad')
    expect(bonziReply('play minesweeper')?.effect).toBe('open')
    expect(bonziReply('open my computer')?.open?.payload?.path).toBe('C:\\')
    expect(bonziReply('open task manager')?.open?.appId).toBe('taskManager')
    expect(bonziReply('open the anti-virus')?.effect).toBe('huff')
    expect(bonziReply('open the anti-virus')?.open).toBeUndefined()
    // "play" with nothing to open falls through to the other intents.
    expect(bonziReply('play a song')?.mood).toBe('sing')
  })

  it('opens games, folders and web sites too', () => {
    expect(bonziReply('play doom')?.open).toMatchObject({ appId: 'dosGame', payload: { windowTitle: 'DOOM' } })
    expect(bonziReply('open wolfenstein')?.open?.payload?.windowTitle).toBe('Wolfenstein 3D')
    expect(bonziReply('open my documents')?.open?.payload?.path).toBe('C:\\My Documents')
    expect(bonziReply('go to youtube.com')?.open?.payload?.url).toBe('youtube.com')
    expect(bonziReply('open google')?.open?.payload?.url).toBe('www.google.com')
    const search = bonziReply('search for cute cats')
    expect(search?.effect).toBe('search')
    expect(search?.open?.payload?.url).toBe('https://www.google.com/search?q=cute%20cats')
    expect(bonziReply('open your website')?.effect).toBe('website')
    expect(BONZI_SMALL_TALK.openWhat).toContain(bonziReply('open the pod bay doors')?.text)
  })

  it('closes programs, but only ones that are open', () => {
    expect(bonziReply('close paint', { openApps: ['paint'] })).toMatchObject({ effect: 'close', close: 'paint' })
    expect(bonziReply('close paint', { openApps: [] })?.effect).toBeUndefined()
    expect(bonziReply('close all windows')?.effect).toBe('closeAll')
    expect(bonziReply('close yourself')?.effect).toBe('byeWarn')
  })

  it('refuses to leave, arms crossed', () => {
    for (const message of ['uninstall yourself', 'go away', 'how do I get rid of you', 'leave me alone']) {
      expect(bonziReply(message)?.effect).toBe('huff')
    }
  })

  it('eats when hungry, and denies hogging the machine', () => {
    expect(bonziReply('are you hungry?')?.effect).toBe('eat')
    expect(bonziReply('banana')?.effect).toBe('eat')
    expect(bonziReply('why is my computer so slow')?.text).toContain('memory')
    expect(bonziReply('who changed my home page')?.text).toContain('home page')
  })

  it('needs two goodbyes before it lets the window close', () => {
    expect(bonziReply('bye')?.effect).toBe('byeWarn')
    expect(bonziReply('bye', { byeArmed: true })?.effect).toBe('bye')
  })

  it('does not treat a stray "later" as a goodbye', () => {
    expect(bonziReply('I will do it later')?.effect).toBeUndefined()
  })

  it('tells the time to the nearest hour', () => {
    const at = (hours: number, minutes: number) => bonziReply('what time is it?', { now: new Date(2026, 0, 1, hours, minutes) })?.text
    expect(at(15, 4)).toContain("about three o'clock")
    expect(at(14, 40)).toContain("about three o'clock")
    expect(at(23, 45)).toContain("about twelve o'clock")
    expect(at(0, 10)).toContain("about twelve o'clock")
  })

  it('knows the day, the date and the year', () => {
    const now = new Date(2026, 8, 26, 12, 0)
    expect(bonziReply('what day is it', { now })?.text).toContain('Saturday')
    expect(bonziReply("what's the date?", { now })?.text).toBe('Today is Saturday, September 26!')
    expect(bonziReply('what year is it', { now })?.text).toContain('2026')
  })

  it('reads chat-speak, contractions and stretched words', () => {
    expect(bonziReply('wat can u do')?.text).toContain('I can tell jokes')
    expect(bonziReply('hru')?.memory.expecting).toEqual({ kind: 'mood' })
    expect(bonziReply("what's ur name?")?.text).toContain('I am Bonzi')
    expect(bonziReply('hiiiii')?.memory.expecting).toEqual({ kind: 'name' })
    expect(bonziReply('byeee')?.effect).toBe('byeWarn')
  })

  it('shrugs off typos in the words that matter', () => {
    expect(bonziReply('wats the wether')?.text).toContain('sunny')
    expect(bonziReply('open calculater')?.open?.appId).toBe('calculator')
    expect(bonziReply('i want a bananna')?.effect).toBe('eat')
    expect(BONZI_JOKES).toContain(bonziReply('tell me a jok')?.text)
  })

  it('asks your name, remembers it, and says it back', () => {
    const [hello, meet, recall] = chat(['hi', 'erick', "what's my name?"])
    expect(hello.memory.expecting).toEqual({ kind: 'name' })
    expect(meet.text).toBe('Nice to meet you, Erick! What a great name!')
    expect(recall.text).toContain('Your name is Erick')
    expect(chat(['I am Erick'])[0].memory.name).toBe('Erick')
    expect(chat(['my name is John Smith'])[0].memory.name).toBe('John Smith')
    // A feeling is not a name.
    expect(chat(['I am Sleepy'])[0].memory.name).toBeUndefined()
    expect(chat(['hi', 'yesss'])[1].memory.name).toBeUndefined()
  })

  it('follows up on what he just asked', () => {
    // "Wanna hear a joke instead?", then yes.
    const offered = chat(['blorp', 'yes'], { random: () => 0.3 })
    expect(offered[0].text).toContain('Wanna hear a joke')
    expect(BONZI_JOKES).toContain(offered[1].text)
    // "How about you, buddy?", then how you are.
    expect(chat(['how are you', 'pretty good'])[1].text).toBe(BONZI_FEELING_LINES.good)
    expect(chat(['how are you', 'not great'])[1].text).toBe(BONZI_FEELING_LINES.sad)
    // "Another one" repeats the last kind of thing.
    expect(BONZI_JOKES).toContain(chat(['tell me a joke', 'another one'])[1].text)
  })

  it('plays riddles', () => {
    const riddle = BONZI_RIDDLES[0]
    const [asked, right] = chat(['tell me a riddle', 'a keyboard'], { random: first })
    expect(asked.text).toBe(riddle.ask)
    expect(BONZI_RIDDLE_RIGHT).toContain(right.text)
    expect(chat(['riddle', 'a banana'], { random: first })[1].text).toBe(riddle.reveal)
    expect(chat(['riddle', 'i give up'], { random: first })[1].text).toBe(riddle.reveal)
  })

  it('plays rock paper scissors and guess the number', () => {
    const [, played] = chat(['rock paper scissors', 'rock'], { random: first })
    expect(played.text).toBe(BONZI_RPS.rock.rock)
    // random 0.45 picks the secret number five.
    const guesses = chat(['guess the number', '3', 'nine', '5'], { random: () => 0.45 })
    expect(guesses.slice(1).map((reply) => reply.text)).toEqual([BONZI_GUESS_HIGHER, BONZI_GUESS_LOWER, BONZI_GUESS_RIGHT])
  })

  it('tells knock knock jokes, and laughs at yours', () => {
    const knock = BONZI_KNOCKS[0]
    expect(chat(['tell me a knock knock joke', "who's there?", 'lettuce who?'], { random: first }).map((reply) => reply.text)).toEqual([
      'Knock knock!',
      knock.who,
      knock.punch,
    ])
    const [whoIsThere, boo, laugh] = chat(['knock knock', 'Boo', 'do not cry, it is only a joke'])
    expect(whoIsThere.text).toBe(BONZI_WHO_IS_THERE)
    expect(boo.text).toBe('Boo who?')
    expect(BONZI_KNOCK_LAUGHS).toContain(laugh.text)
  })

  it('does math', () => {
    expect(bonziReply('what is 7 times 8?')?.text).toMatch(/7 times 8 is 56!$/)
    expect(bonziReply("what's 2+2")?.text).toMatch(/2 plus 2 is 4!$/)
    expect(bonziReply('two plus two')?.text).toMatch(/2 plus 2 is 4!$/)
    expect(bonziReply('square root of 16')?.text).toMatch(/square root of 16 is 4!$/)
    expect(bonziReply('(2 + 3) x 4')?.text).toMatch(/is 20!$/)
    expect(bonziReply('1000000 * 3')?.text).toMatch(/is 3,000,000!$/)
    expect(bonziReply('10 / 0')?.text).toBe(BONZI_MATH_ZERO)
    // A sentence with numbers in it is not a sum.
    expect(bonziReply('i have 2 dogs and 3 cats')?.text).not.toMatch(/is \d/)
  })

  it('looks questions about the world up on the Web', () => {
    expect(bonziReply('who is Albert Einstein?')).toMatchObject({ effect: 'lookup', lookup: 'albert einstein' })
    expect(bonziReply('tell me about the moon')?.lookup).toBe('moon')
    expect(bonziReply('why is the sky blue?')?.lookup).toBe('why is the sky blue')
    expect(bonziReply('is pluto a planet')?.lookup).toBe('is pluto a planet')
    // Not about himself, you, or nothing in particular.
    for (const message of ['what is your name', 'what is my name', 'what is up', 'what is that', 'who are you']) {
      expect(bonziReply(message)?.effect).not.toBe('lookup')
    }
  })

  it('reacts to how you feel', () => {
    const bored = bonziReply('i am so bored')
    expect(bored?.text).toBe(BONZI_FEELING_LINES.bored)
    expect(bored?.memory.expecting).toEqual({ kind: 'offer', offer: 'game' })
    expect(bonziReply('not feeling well')?.text).toBe(BONZI_FEELING_LINES.sick)
    expect(bonziReply("i'm sad")?.text).toBe(BONZI_FEELING_LINES.sad)
    expect(bonziReply('i want to kill myself')?.text).toBe(BONZI_CARE_LINE)
  })

  it('takes a compliment, an insult, and being called dumb', () => {
    expect(BONZI_SMALL_TALK.compliment).toContain(bonziReply('ur so funny')?.text)
    expect(BONZI_SMALL_TALK.humble).toContain(bonziReply('you are dumb')?.text)
    expect(BONZI_SMALL_TALK.insult).toContain(bonziReply('i hate you')?.text)
    // A question about him is not a compliment.
    expect(bonziReply('are you smart?')?.text).toContain('super smart')
  })

  it('says how to talk to him after two misses in a row', () => {
    const [, second] = chat(['blorp', 'zzxq'])
    expect(second.text).toBe(BONZI_SMALL_TALK.confused[0])
    expect(second.memory.misses).toBe(2)
  })

  it('lists every line he can say for the recorded voice', () => {
    const lines = bonziVoiceLines()
    const texts = lines.map((line) => line.text)
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts).toContain(BONZI_NOT_A_MENU)
    expect(texts.filter((text) => text.includes("o'clock"))).toHaveLength(12)
    // Every fixed reply is on the list (sampled across intents).
    const fixed = [
      'bye', 'be quiet', 'talk to me', 'help', 'search the web', 'weather', 'are you spyware', 'banana', 'thanks',
      'asdf', 'why?', 'open paint', 'go away', 'antivirus', 'slow', 'upgrade', 'homepage', 'hungry', 'tell me a fact',
      'tell me a story', 'riddle', 'rock paper scissors', 'flip a coin', 'roll a die', 'i am bored', 'you are dumb',
      'whats your favorite color', 'how old are you', 'do you know clippy', 'i like pizza', 'what day is it',
      'open the pod bay doors', 'can you fly', 'should i go to bed', 'lol', 'good night', 'i want to kill myself',
    ]
    for (const message of fixed) expect(texts).toContain(bonziReply(message)?.text)
    // Lines made up on the spot are not (they use the synthetic voice).
    expect(texts).not.toContain(bonziReply('what is 7 times 8')?.text)
    // Each pronunciation override still matches a real line, and caps words are spelled out.
    for (const text of Object.keys(BONZI_SAY_AS)) expect(texts).toContain(text)
    for (const { say } of lines) expect(say).not.toMatch(/BonziBUDDY|DOOM|\b988\b/)
  })

  it('does not repeat the line it just said', () => {
    const said = pickLine(BONZI_JOKES, first)
    expect(pickLine(BONZI_JOKES, first, said)).not.toBe(said)
  })

  it('always has something to say', () => {
    expect(bonziReply('asdfghjkl')?.text).toBeTruthy()
    expect(bonziReply('why is the sky blue?')?.text).toBeTruthy()
  })
})
