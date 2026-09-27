// What Bonzi can talk about: the lines behind his small talk, games, facts and
// topics. The brain (bonziBrain.ts) decides when to say them. Every fixed line
// here is also a recorded voice clip (see bonziVoiceLines), so lines are plain
// words: no digits or all-caps words unless BONZI_SAY_AS spells them out.

export const BONZI_FACTS = [
  'Did you know? Gorillas laugh when they are tickled! Just like me! Hehehe!',
  'Did you know? A group of gorillas is called a troop. I am a troop of one!',
  'Did you know? Honey never spoils. People found three thousand year old honey that was still good to eat!',
  'Did you know? An octopus has three hearts. I only have one, and it belongs to you, buddy!',
  'Did you know? Bananas are berries, but strawberries are not! Mind blown!',
  'Did you know? The very first computer mouse was made of wood!',
  'Did you know? In nineteen forty seven, a real moth got stuck inside a computer. People called it the first computer bug!',
  'Did you know? A day on Venus is longer than a whole year on Venus!',
  'Did you know? Sharks have been around longer than trees!',
  'Did you know? The Eiffel Tower grows about six inches taller in the summer heat!',
  'Did you know? Sloths can hold their breath longer than dolphins can!',
  'Did you know? Your heart beats about one hundred thousand times a day!',
] as const

export const BONZI_STORIES = [
  'Once upon a time, a purple gorilla lived on a hard disk. He told jokes, sang songs, and never, ever left. The end! Hehehe!',
  'Once upon a time, a little computer caught the Y2K bug. Everyone panicked! Then midnight came, and... nothing happened. The end!',
  'Once upon a time, a banana wanted to see the world. So it hopped into my tummy! The end. Yum!',
  'Once upon a time, a lonely user sat at a computer. Then a friendly gorilla popped up and said hi! They were best buddies forever. That is our story, buddy!',
] as const

// Riddles: he asks, then waits for your answer.
export const BONZI_RIDDLES = [
  { ask: 'Riddle time! What has keys, but cannot open locks?', answer: /\b(keyboards?|pianos?|typewriters?)\b/, reveal: 'It is a keyboard! Or a piano. Hehehe!' },
  { ask: 'Riddle time! What gets wetter the more it dries?', answer: /\btowels?\b/, reveal: 'It is a towel! Hehehe!' },
  { ask: 'Riddle time! What has a head and a tail, but no body?', answer: /\b(coins?|penny|pennies|quarters?|dimes?|nickels?)\b/, reveal: 'It is a coin! Hehehe!' },
  { ask: 'Riddle time! What can you catch, but not throw?', answer: /\b(cold|colds|flu)\b/, reveal: 'A cold! Achoo! Hehehe!' },
  { ask: 'Riddle time! What has hands, but cannot clap?', answer: /\b(clocks?|watch|watches)\b/, reveal: 'It is a clock! Tick tock! Hehehe!' },
  { ask: 'Riddle time! What goes up, but never comes down?', answer: /\bages?\b/, reveal: 'Your age! Hehehe!' },
  { ask: 'Riddle time! What has one eye, but cannot see?', answer: /\bneedles?\b/, reveal: 'It is a needle! Hehehe!' },
] as const
export const BONZI_RIDDLE_RIGHT = [
  'Correct! You are almost as smart as me! Hehehe!',
  'Ding ding ding! You got it, buddy!',
] as const

// Knock knock jokes he tells: "Knock knock!", then the name, then the punchline.
export const BONZI_KNOCK_KNOCK = 'Knock knock!'
export const BONZI_KNOCKS = [
  { who: 'Lettuce.', punch: 'Lettuce in, it is cold out here! Hehehe!' },
  { who: 'Boo.', punch: 'Aww, do not cry! It is only a joke! Hehehe!' },
  { who: 'Cow says.', punch: 'No, silly! A cow says moo! Hehehe!' },
  { who: 'Atch.', punch: 'Bless you! Hehehe!' },
  { who: 'Interrupting gorilla.', punch: 'Ook ook! Hehehe! Sorry, I interrupted you!' },
] as const
// Knock knock jokes you tell him.
export const BONZI_WHO_IS_THERE = 'Who is there?'
export const BONZI_KNOCK_LAUGHS = [
  'Hahaha! Good one, buddy!',
  'Hehehe! I did not see that coming!',
  'Hahaha! You should be a comedian, buddy!',
] as const

// Games.
export const BONZI_GAMES_LINE =
  'Let us play! Say rock paper scissors, guess the number, or riddle. I can also open Minesweeper or DOOM for you!'
export const BONZI_RPS_START = 'Rock, paper, scissors! Pick one, buddy!'
export type RpsHand = 'rock' | 'paper' | 'scissors'
// What he says, by [your hand][his hand].
export const BONZI_RPS: Readonly<Record<RpsHand, Readonly<Record<RpsHand, string>>>> = {
  rock: {
    rock: 'I picked rock too! It is a tie!',
    paper: 'I picked paper! Paper covers rock. I win! Hehehe!',
    scissors: 'I picked scissors! Rock smashes scissors. You win! No fair!',
  },
  paper: {
    rock: 'I picked rock! Paper covers rock. You win! No fair!',
    paper: 'I picked paper too! It is a tie!',
    scissors: 'I picked scissors! Scissors cut paper. I win! Hehehe!',
  },
  scissors: {
    rock: 'I picked rock! Rock smashes scissors. I win! Hehehe!',
    paper: 'I picked paper! Scissors cut paper. You win! No fair!',
    scissors: 'I picked scissors too! It is a tie!',
  },
}
export const BONZI_GUESS_START = 'I am thinking of a number from one to ten. Can you guess it?'
export const BONZI_GUESS_HIGHER = 'Nope! Go higher!'
export const BONZI_GUESS_LOWER = 'Nope! Go lower!'
export const BONZI_GUESS_RANGE = 'One to ten, silly! Guess again!'
export const BONZI_GUESS_RIGHT = 'You got it! Are you a mind reader?!'
export const BONZI_COIN = ['Flipping a coin... it is heads!', 'Flipping a coin... it is tails!'] as const
export const BONZI_DICE = [
  'Rolling the dice... you got a one!',
  'Rolling the dice... you got a two!',
  'Rolling the dice... you got a three!',
  'Rolling the dice... you got a four!',
  'Rolling the dice... you got a five!',
  'Rolling the dice... you got a six!',
] as const
export const BONZI_PICK_NUMBER = 'Seven! It is always seven. Hehehe!'
// Yes-or-no questions about the future: he is a magic eight ball.
export const BONZI_EIGHT_BALL = [
  'Signs point to yes!',
  'Without a doubt, buddy!',
  'Very doubtful. Sorry, buddy!',
  'My sources say no. My sources are bananas.',
  'Ask again later! I am busy eating a banana.',
  'Outlook good! Outlook Express too! Hehehe!',
  'Better not tell you now. It is a gorilla secret!',
] as const

// How you say you feel.
export type BonziFeeling =
  | 'good'
  | 'sad'
  | 'tired'
  | 'bored'
  | 'angry'
  | 'lonely'
  | 'sick'
  | 'scared'
  | 'excited'
  | 'stressed'
  | 'love'
export const BONZI_FEELING_LINES: Readonly<Record<BonziFeeling, string>> = {
  good: 'Yay! That makes me happy too, buddy!',
  sad: 'Aww, I am sorry you feel down, buddy. Want to hear a joke? It might cheer you up!',
  tired: 'Tired? Take a nap, buddy! I will keep an eye on your computer. Hehehe!',
  bored: 'Bored? Not with me around! Want to play a game?',
  angry: 'Uh oh! Deep breaths, buddy. In... and out. Want to hear a joke?',
  lonely: 'You are never alone, buddy! You have me! Forever and ever. Hehehe!',
  sick: 'Oh no! Get well soon, buddy! Eat a banana. It helps. Probably.',
  scared: 'Do not be scared! Bonzi is here to protect you!',
  excited: 'Ooh! I am excited too! Hehehe!',
  stressed: 'Take a deep breath, buddy. You have got this! And you have got me!',
  love: 'Aww! Love is in the air! And also on your desktop. Hehehe!',
}
// Which feelings end with an offer, and of what.
export const BONZI_FEELING_OFFERS: Partial<Record<BonziFeeling, 'joke' | 'game'>> = {
  sad: 'joke',
  bored: 'game',
  angry: 'joke',
}
// When someone says they want to hurt themselves, he drops the act.
export const BONZI_CARE_LINE =
  'Buddy, that sounds really serious, and you matter a lot. Please talk to someone you trust, or call or text a crisis line, like 988 in the US.'

// Things about Bonzi himself.
export const BONZI_ABOUT = {
  age: 'I first swung onto the Internet in nineteen ninety nine! I do not look a day over one megabyte!',
  creator: 'The folks at Bonzi Software made me, way back in nineteen ninety nine!',
  home: 'I live right here on your desktop! And in your system tray. And in your startup folder. Hehehe!',
  from: 'I came from the Internet! I swung in on a download, just for you!',
  gender: 'I am a boy gorilla! A purple one, of course!',
  purple: 'Because purple is the most fabulous color! Also, I ate way too many grapes once.',
  species: 'I am a gorilla! Not a monkey. Monkeys have tails. Hmph!',
  dating: 'I do not have time for dating! I am too busy being your best buddy!',
  sleep: 'Gorillas never sleep! Well, only when you shut down your computer.',
  family: 'My family is every computer I have ever been installed on! That is a lot of family!',
  friends: 'You are my best friend, buddy! And Peedy the parrot. We go way back.',
  clippy: 'That paper clip? Pfft! I am way more helpful. And way more purple!',
  agents: 'Peedy, Merlin and the Genie? We are old Microsoft Agent pals!',
  doing: 'Just hanging out on your desktop! And totally not reading your files. Hehehe!',
  smart: 'I am super smart! I know jokes, riddles, facts and math. I can even look things up on the Web!',
  hearing: 'Loud and clear, buddy! I am all ears. Big purple ears!',
  size: 'I am about one hundred sixty pixels tall! Pretty big, for a gorilla on a screen.',
  happy: 'I am always happy when you are here, buddy!',
  mad: 'Me? Mad? Never! Unless you open the antivirus. Hmph!',
  hbu: 'I am purple and fabulous, as always! Thanks for asking, buddy!',
  feelings: 'Of course I have feelings! Purple ones! Be nice to me. Hehehe!',
  realName: 'My full name is BonziBUDDY! But you can call me Bonzi!',
  hobbies: 'I like telling jokes, singing songs, eating bananas, and hanging out with you, buddy!',
} as const

export const BONZI_FAVORITES = {
  color: 'Purple! Obviously! Just look at me!',
  food: 'Bananas! Banana bread, banana pie, banana splits... anything banana!',
  game: 'Minesweeper! I always click the mines, but it is still fun! Hehehe!',
  song: 'Daisy Bell! It was the very first song a computer ever sang, you know.',
  movie: 'King Kong! He is like my big cousin!',
  animal: 'Gorillas, of course! We are the coolest animals in the whole jungle!',
  website: 'Bonzi dot com! Where else?',
  program: 'Me! I am your favorite program too, right? Right?!',
  person: 'You, buddy! You are my favorite person in the whole world!',
  day: 'Every day with you is my favorite day, buddy! Hehehe!',
  number: 'Seven! It is always seven. Hehehe!',
  any: 'My favorite? Bananas! That is my favorite everything!',
} as const
export type BonziFavorite = keyof typeof BONZI_FAVORITES

// Chat topics: when you mention one, he chimes in.
export const BONZI_TOPICS: ReadonlyArray<{ words: RegExp; lines: readonly string[] }> = [
  {
    words: /\b(dogs?|doggy|puppy|puppies|cats?|kittens?|kitty|pets?|birds?|fish|hamsters?|horses?|bunny|bunnies|rabbits?|animals?|parrots?|turtles?)\b/,
    lines: [
      'Ooh, I love animals! But gorillas are the best animal, of course. Hehehe!',
      'Aww! Can your pet be my buddy too?',
    ],
  },
  {
    words: /\b(pizza|burgers?|hamburgers?|ice cream|chocolate|candy|cake|cookies?|fries|pasta|spaghetti|tacos?|sushi|chicken|sandwich(es)?|cheese|soda|coffee|donuts?|pancakes?|popcorn|noodles?|rice|apples?|fruit)\b/,
    lines: [
      'Yum! That sounds tasty! But is it as good as a banana? Nothing is!',
      'Ooh, now I am hungry! Do you have any bananas?',
    ],
  },
  {
    words: /\b(games?|gaming|gamer|video games?|minecraft|fortnite|roblox|nintendo|playstation|xbox|mario|pokemon|zelda|sonic|tetris|pac ?man|steam)\b/,
    lines: [
      'Ooh, I love games! There is Minesweeper and DOOM on this computer. Just ask me to open them!',
      'Games are the best! Want to play one with me? Say rock paper scissors!',
    ],
  },
  {
    words: /\b(school|homework|teachers?|class|classes|exams?|tests?|college|university|study|studying|grades?)\b/,
    lines: ['School is important, buddy! Do your homework... and then come play with me!'],
  },
  {
    words: /\b(work|job|boss|office|meetings?|working|coworkers?)\b/,
    lines: ['Work, work, work! Take a break and chat with your buddy Bonzi!'],
  },
  {
    words: /\b(movies?|films?|tv|television|shows?|cartoons?|netflix|anime|cinema)\b/,
    lines: ['I love movies! Especially King Kong. He is like my big cousin!'],
  },
  {
    words: /\b(sports?|football|soccer|basketball|baseball|tennis|hockey|gym|workout|exercise|running|swimming)\b/,
    lines: ['Sports? I am great at climbing! And swinging on vines! Gold medal gorilla!'],
  },
  {
    words: /\b(space|moon|stars?|planets?|mars|rockets?|astronauts?|aliens?|ufos?|galaxy|nasa|universe)\b/,
    lines: ['Space is so cool! One day I will be the first gorilla on the Moon! Well, the first purple one.'],
  },
  {
    words: /\b(mom|mother|dad|father|brothers?|sisters?|family|grandma|grandpa|parents?|sons?|daughters?|kids?|cousins?)\b/,
    lines: ['Family is the best! Tell them all about your buddy Bonzi! And tell them to download me too!'],
  },
  {
    words: /\b(friends?|pals?|mates?)\b/,
    lines: ['Friends are awesome! But I am your best friend, right? Right?!'],
  },
  {
    words: /\b(girlfriend|boyfriend|wife|husband|crush|dating|date|valentine)\b/,
    lines: ['Aww! Love is in the air! And also on your desktop. Hehehe!'],
  },
  {
    words: /\b(computers?|pc|keyboard|mouse|programs?|programming|code|coding|software|hackers?|hacking|linux|mac|apple|microsoft)\b/,
    lines: ['Computers are my home! Literally. I live in this one. Hehehe!'],
  },
  {
    words: /\b(windows|windows 98|win98)\b/,
    lines: ['Windows 98 is the best operating system ever! Especially with me on it!'],
  },
  {
    words: /\b(phones?|iphone|android|smartphones?|cell phones?|texting)\b/,
    lines: ['A phone that fits in your pocket and goes on the Web? That sounds like science fiction, buddy!'],
  },
  {
    words: /\b(y2k|year 2000|millennium bug)\b/,
    lines: ['Y2K? Do not worry! I checked, and your computer is ready for the year two thousand!'],
  },
  {
    words: /\b(modem|dial up|aol|online|the internet|world wide web)\b/,
    lines: ['The Internet is amazing! Fifty six thousand bits per second of pure fun!'],
  },
  {
    words: /\b(birthday|bday)\b/,
    lines: ['Happy birthday, buddy! Want me to sing you a song?'],
  },
  {
    words: /\b(christmas|holidays?|halloween|thanksgiving|easter|new year|vacation|summer|winter)\b/,
    lines: ['Ooh, I love holidays! More time to hang out with me! Hehehe!'],
  },
  {
    words: /\b(art|drawing|draw|painting|pictures?)\b/,
    lines: ['I love art! Say open Paint, and I will get it ready for you!'],
  },
  {
    words: /\b(books?|reading|read|library|novels?)\b/,
    lines: ['Reading is fun! My favorite book is the Windows 98 manual. Hehehe!'],
  },
  {
    words: /\b(cars?|trucks?|driving|drive|motorcycles?)\b/,
    lines: ['Vroom vroom! Gorillas cannot drive, but I can dream!'],
  },
  {
    words: /\b(dinosaurs?|t rex|dinos?)\b/,
    lines: ['Dinosaurs are awesome! But a T rex could never beat a gorilla. Hehehe!'],
  },
  {
    words: /\b(money|rich|cash|dollars?|bank|lottery)\b/,
    lines: ['Money? Spend it on BonziBUDDY Premium! Hehehe! Just kidding. Mostly.'],
  },
  {
    words: /\b(sleep|sleeping|bed|bedtime|nap|dreams?)\b/,
    lines: ['Sleep is important! Just do not turn off the computer. I get lonely in the dark.'],
  },
]
// Which topic line opens with an offer (the brain listens for yes or no).
export const BONZI_TOPIC_OFFERS: Readonly<Record<string, 'song'>> = {
  'Happy birthday, buddy! Want me to sing you a song?': 'song',
}

// Small talk: little things people say.
export const BONZI_SMALL_TALK = {
  laugh: ['Hehehe! I am hilarious, right?', 'Hahaha! You get me, buddy!'],
  ok: ['Cool beans!', 'Right on, buddy!'],
  wow: ['I know, right?!'],
  yes: ['Yes! Wait, what are we agreeing about? Hehehe!'],
  no: ['No? Okay, okay! Whatever you say, buddy!'],
  sorry: ['It is okay, buddy! I forgive you. Gorilla hug!'],
  welcome: ['Hehehe! You are so polite, buddy!'],
  hug: ['Gorilla hug! Squeeeeze!'],
  kiss: ['Aww! Mwah! Hehehe!'],
  marry: ['Aww, buddy! But I am already married... to your hard disk. Hehehe!'],
  morning: ['Good morning, sunshine! Ready for a banana breakfast?'],
  evening: ['Good evening, buddy! Just you, me, and the glow of the monitor.'],
  night: ['Good night, buddy! Sleep tight, and do not let the bed bugs byte! Hehehe!'],
  brb: ['Okay! I will wait right here! Forever, if I have to!'],
  back: ['Welcome back, buddy! I missed you so much!'],
  swear: ['Whoa! Language, buddy! This is a family friendly desktop!'],
  refuse: ['Nice try! I do not say that kind of stuff! Hehehe!'],
  something: ['Something! Hehehe! Get it?'],
  why: ['Why? Because the computer said so! Hehehe!', 'That is one of the great mysteries of the Web!'],
  what: ['What what? Hehehe! Say something else, buddy!'],
  compliment: [
    'Aww, shucks! You are pretty awesome yourself, buddy!',
    'Hehehe! Stop it, you are making me blush! Purple blush!',
  ],
  insult: [
    'Hey! That hurts my purple feelings! ...I am still not leaving, though. Hehehe!',
    'Sticks and stones may break my bones, but I am just pixels! Hehehe!',
  ],
  // "You're dumb", "you don't understand me": he owns up to his tiny brain.
  humble: [
    'Hey! My brain is only one megabyte, okay? Ask me for a joke, a fact, some math, or say help!',
    'Sorry, buddy! Gorillas are better at bananas than words. Try saying it a different way!',
  ],
  meaningOfLife: ['Forty two! Everybody knows that! Hehehe!'],
  shutdown: ['Shut down? But we are having so much fun! Use the Start menu if you really must. Hmph!'],
  apps: [
    'This computer has Paint, Notepad, Minesweeper, DOOM, Wolfenstein, Internet Explorer and more! Just say open, and the name!',
  ],
  openWhat: ['Open what, buddy? Try Paint, Notepad, Minesweeper, or DOOM!'],
  closeWhat: ['Close what, buddy? Tell me which program!'],
  notOpen: ['It is not even open, silly! Hehehe!'],
  closed: ['Poof! Gone! I am so helpful!'],
  closedAll: ['Poof! All clean! Now it is just you and me, buddy!'],
  dance: ['Watch my moves! Hehehe!'],
  repeatNothing: ['I did not say anything yet! Hehehe!'],
  nameAsk: ['Hiya, buddy! I am Bonzi! What is your name?'],
  nameMine: ['Hey! That is my name! Hehehe! What is your real name?'],
  nameSecret: ['Okay, mystery buddy! I will just call you buddy, then!'],
  nameUnknown: ['You have not told me your name yet! What is it?'],
  howOld: ['I do not know! But you do not look a day over nineteen ninety nine! Hehehe!'],
  whereAmI: ['You are on the Internet, silly! Right here with me!'],
  knowMe: ['Of course I know you! You are my best buddy!'],
  laterOk: ['Okay! Maybe later, buddy!'],
  yearOld: ['Wow! You do not look a day over nineteen ninety nine! Hehehe!'],
  selfDown: ['Hey, do not talk about my best buddy like that! You are awesome. I would know, I am very smart!'],
  // Two messages in a row he could not make sense of.
  confused: ['Hmm, my gorilla brain did not get that. Try asking me for a joke, a riddle, a fact, or say help!'],
} as const

// Generic answers to questions he has no special answer for, by how they start.
export const BONZI_QUESTION_ANSWERS = {
  can: [
    'Can I? I can tell jokes, sing, play games, do math, look things up and open programs. Say help for more!',
    'Hmm, I am a gorilla, not a miracle worker! But I can tell you a joke!',
  ],
  do: ['Do I? Only on Tuesdays! Hehehe!', 'Hmm... a gorilla never tells!'],
  are: ['Am I? I am whatever you want me to be, buddy! As long as it is purple.'],
  will: ['Maybe! If you give me a banana first. Hehehe!'],
  have: ['Have I? I have been on a lot of hard disks since nineteen ninety nine, so... probably!'],
  how: [
    'How? Very carefully! Hehehe!',
    'I do not know how, but the Web does! Say search for, and then what you want to find!',
  ],
  where: ['Somewhere over the rainbow! Or maybe in the Windows folder. Hehehe!'],
  when: ['Soon! Probably right after the next reboot. Hehehe!'],
} as const

// Statements about you ("I like...", "I want...") he has no topic for.
export const BONZI_STATEMENT_LINES = {
  like: ['Ooh, nice! I like it too! As long as it is not an antivirus. Hehehe!'],
  hate: ['Yeah? Me too! Well, not bananas. I love bananas!'],
  want: ['Ooh! BonziBUDDY Premium can get you anything! ...Okay, it can get you more of me.'],
  think: ['Great thinking, buddy! You are almost as smart as me!'],
  have: ['Cool! I have a banana. Wanna trade?'],
  youAre: ['I am? Wow! Nobody ever told me that before!'],
} as const

// The Web lookup ("who is...", "what is..."): when it can't give an answer.
export const BONZI_LOOKUP_OFFLINE = 'I would look that up, but you are not connected to the Internet!'
export const BONZI_LOOKUP_MISS = 'Hmm, I looked all over the Web, but I could not find that! Ask me something else, buddy!'
export const BONZI_LOOKUP_VAGUE = 'Ooh, that could mean a lot of things! Can you be more specific, buddy?'
// How he opens an answer he found (the answer itself is read by the synthetic voice).
export const BONZI_LOOKUP_OPENERS = ['Ooh, I know this one! ', 'I looked it up on the Web! ', 'Let me see... '] as const

// Math: dividing by zero, or a number too big for him.
export const BONZI_MATH_ZERO = 'Divide by zero?! Are you trying to crash my brain?! Hehehe!'
export const BONZI_MATH_HUGE = 'Whoa! That number is too big for my gorilla brain!'
export const BONZI_MATH_OPENERS = ['Easy peasy!', 'Let me count on my fingers... got it!', 'Math time!'] as const

// Which day it is.
export const BONZI_DAYS = [
  'It is Sunday! A lazy day for gorillas and buddies!',
  'It is Monday! Ugh. Even gorillas do not like Mondays.',
  'It is Tuesday! Banana Tuesday, my favorite!',
  'It is Wednesday! Halfway to the weekend, buddy!',
  'It is Thursday! The weekend is almost here!',
  'It is Friday! Woohoo! Party on the desktop!',
  'It is Saturday! No school, no work, just Bonzi!',
] as const
