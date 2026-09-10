// Project brochures surfaced as WordPad documents inside the OS at
// C:\My Documents\Fishbook.doc and C:\My Documents\KwartoKlaro.doc.
// WordPad renders this HTML. These are written to sell the products: what they
// do and why it matters, not implementation notes. Prose deliberately keeps
// dashes light (commas / colons / periods) per the house writing style.

const shell = (title: string, promise: string, subtitle: string, body: string) =>
  [
    '<div style="font-family:Arial,Helvetica,sans-serif; color:#111; font-size:14px; line-height:1.35">',
    '<div style="border:2px solid #003399; padding:16px 18px; margin-bottom:18px; background:#f7f9ff">',
    `<div style="font-size:28px; font-weight:700; color:#003399; margin-bottom:2px">${title}</div>`,
    `<div style="font-size:15px; font-weight:700; color:#1a5fb4; margin-bottom:6px">${promise}</div>`,
    `<div style="font-size:13px; color:#555">${subtitle}</div>`,
    '</div>',
    body,
    '</div>',
  ].join('')

const heading = (text: string) =>
  `<div style="font-size:18px; font-weight:700; color:#003399; border-bottom:1px solid #b5b5b5; padding-bottom:4px; margin:0 0 8px">${text}</div>`

const section = (title: string, body: string) =>
  `<div style="margin:0 0 18px">${heading(title)}${body}</div>`

const para = (text: string) => `<p style="margin:0 0 7px; line-height:1.42">${text}</p>`

const feature = (name: string, desc: string) =>
  `<p style="margin:0 0 9px"><span style="font-weight:700; color:#1a3a6b">${name}</span><br><span>${desc}</span></p>`

const bullets = (items: string[]) =>
  `<ul style="margin:6px 0 0 22px; padding:0; line-height:1.4">${items
    .map((item) => `<li style="margin:3px 0">${item}</li>`)
    .join('')}</ul>`

const callout = (text: string) =>
  `<div style="border-left:4px solid #1a5fb4; background:#eef3fb; padding:9px 12px; margin:0 0 14px">${text}</div>`

export const fishbookDocHtml = shell(
  'Fishbook',
  'Your own social network. On your machine, for your eyes only.',
  'Product overview. A private social platform that is becoming a social simulation game.',
  [
    section(
      'The idea',
      [
        para(
          'Every social network you use is somebody else quietly reading your life. Fishbook flips that. It is a complete social platform that runs entirely on your own computer: your posts, your photos, your videos, your conversations, all of it stays on your own drive.',
        ),
        para(
          'Nothing is uploaded. Nothing is scraped. There is no cloud account, no advertiser, and no feed algorithm deciding what you deserve to see today.',
        ),
        callout(
          'And then it goes somewhere stranger. Most of the people on your Fishbook are not people at all. They are AI characters who remember you, form opinions about you, and warm to you or cool on you depending on how you actually treat them.',
        ),
      ].join(''),
    ),
    section(
      'What you can do with it',
      [
        feature(
          'A real feed, not a demo',
          'Post text and media, react, comment, and share other people posts through to your own timeline. It behaves the way you already expect a feed to behave.',
        ),
        feature(
          'Stories that expire',
          'Share a photo or a short clip that disappears after 24 hours, with view tracking so you can see who looked. Video is capped at 20 seconds, exactly like the real thing.',
        ),
        feature(
          'Reels',
          'A dedicated short-video surface with its own like model, separate from the main feed.',
        ),
        feature(
          'Messenger with floating chats',
          'Full conversation view, or pop-out chat windows that dock over whatever you are doing. On a phone it collapses to a clean single-pane thread with a back button.',
        ),
        feature(
          'Friends and discovery',
          'Send and accept requests, browse a member directory, and get suggestions. Your social graph is yours to shape.',
        ),
        feature(
          'Profiles worth filling in',
          'Editable profile fields, profile pictures, an about section, and your own media library sitting behind it.',
        ),
        feature(
          'Dark and light, and a layout that adapts',
          'A three-column desktop layout that gracefully folds down to a bottom-nav mobile experience as the window narrows.',
        ),
      ].join(''),
    ),
    section(
      'The part nobody else is doing',
      [
        para(
          'Fishbook ships with a populated world. There are already 144 real, loginable accounts, and they are being turned into AI-driven characters.',
        ),
        bullets([
          'Every character gets a persona: an archetype plus personality traits like warmth and patience, generated deterministically and then hand-editable.',
          'Each one holds a hidden affection score toward you that moves with the conversation. Be careless and it drops.',
          'Characters live in the world, not just in a chat box. A simulation loop drives what they do while you are away.',
          'Model routing is pluggable and assignable per character: a small fast local model for background chatter, a stronger one for direct messages.',
          'An admin panel exposes the tuning, so you can shape the world instead of editing config files.',
        ]),
        para(
          'The social network is the shell. The game is the relationships.',
        ),
      ].join(''),
    ),
    section(
      'Built to be private by construction',
      [
        para(
          'Privacy here is not a policy page, it is the architecture. There is nowhere for your data to go.',
        ),
        bullets([
          'Media lives on your filesystem. The database only ever stores paths.',
          'The browser never picks where a file lands. Your upload directory is derived from your session, so one account cannot write into another.',
          'Media requests require a login, and story media additionally respects per-story visibility.',
          'Uploads that could execute in your browser are rejected outright.',
          'Language models run locally, so a private conversation with a character stays private.',
        ]),
      ].join(''),
    ),
    section(
      'Status',
      [
        para(
          'In active development. The social platform is working end to end and the back end carries 857 tests. The current push is the character layer: moving conversations into the database and bringing the agents to life.',
        ),
        para(
          'Built with React and Vite on the front, Flask and PostgreSQL behind it, and a local model runtime for the AI.',
        ),
      ].join(''),
    ),
  ].join(''),
)

export const kwartoKlaroDocHtml = shell(
  'KwartoKlaro',
  'Know the room before you move.',
  'Product overview. Rental validation and decision support for Filipino students.',
  [
    section(
      'The problem',
      [
        para(
          'Finding student housing in the Philippines means scrolling Facebook Marketplace and student groups, where the listing rarely tells you the truth until you have already spent a jeepney fare finding out.',
        ),
        bullets([
          'A PHP 2,000 headline price that turns out to be one bed in a six-person room.',
          'Utility fees and sub-meter rates that only surface after the visit.',
          'Curfews, visitor bans, cooking rules, and gender restrictions nobody mentioned.',
          'A place advertised as near school that is actually three rides and a walk away.',
          'A GCash reservation deposit requested before you are allowed to see the room.',
          'Photos that somehow never include the bathroom.',
        ]),
        callout(
          'KwartoKlaro puts all of that on the screen before you message the landlord. Klaro ang gastos. Klaro ang rules. Klaro ang biyahe.',
        ),
      ].join(''),
    ),
    section(
      'What students get',
      [
        feature(
          'Honest pricing, broken down',
          'Base rent, deposit, advance, recurring fixed charges, utility rules, and estimated commute cost are shown as separate lines. Every public price states whether it buys a private room, a shared room, or a single bedspace.',
        ),
        feature(
          'House rules before contact',
          'Curfew, visitors, cooking, laundry, pets, quiet hours, occupancy, and appliance limits are all visible up front, so you rule places out before wasting a trip.',
        ),
        feature(
          'Search that filters on what matters',
          'A filter rail with sort, active filter chips, and filters for school, area, budget, and flood exposure. Results are shared between public search and your dashboard.',
        ),
        feature(
          'Save and compare',
          'Keep a shortlist and put up to three places side by side on the things that actually decide it: total monthly cost, rules, commute, and risk.',
        ),
        feature(
          'Commute you can interrogate',
          'A dedicated commute view showing the arithmetic, the contributing factors, each leg of the trip, and the alternatives, rather than a single unexplained number.',
        ),
        feature(
          'Flood history, not guesswork',
          'Historical flood susceptibility drawn from the government geoscience data, so a cheap room in a yearly flood path does not look like a bargain.',
        ),
        feature(
          'Full room profiles',
          'Gallery, structured costs, amenities, rules, and an inquiry path, with a standing reminder to view the place in person before committing to anything.',
        ),
      ].join(''),
    ),
    section(
      'What landlords get',
      [
        feature(
          'A dashboard, not a comment thread',
          'Create and edit listing drafts with structured pricing, rules, and location, then submit for review. No more reposting the same photo dump every semester.',
        ),
        feature(
          'Structure without losing your voice',
          'Your original description stays available alongside the structured version, and any field the system suggests is only a suggestion until you confirm it.',
        ),
        feature(
          'Reach students who are ready',
          'People arriving at your listing have already seen the price basis, the rules, and the commute. The enquiries you get are from students who have self-qualified.',
        ),
      ].join(''),
    ),
    section(
      'Trust is the product',
      [
        para(
          'Anyone can build a listing site. The reason to use this one is that it refuses to flatter a bad listing.',
        ),
        bullets([
          'Risk decisions are deterministic, versioned, and explainable, and a high enough score pulls a listing out of public view for human review.',
          'Every derived score records its inputs, reason codes, calculation version, data source, and timestamp.',
          'Public maps show a generalized area. Exact coordinates and verification evidence require authorization.',
          'When route or flood data is missing, the product says Data Unavailable. It never substitutes a reassuring number it cannot support.',
          'Identity verification and proof of ownership are tracked as separate statuses, because they are separate claims.',
        ]),
        para(
          'Browsing is open to everyone. An account is only needed to save, compare, chat, or reveal landlord contact details.',
        ),
      ].join(''),
    ),
    section(
      'Status',
      [
        para(
          'In active development, delivered in phases. The engineering foundation and authentication are complete and verified against a live project. Search, the listing catalog, the landlord workflow, and the decision tools are in progress. Moderation tooling and the mobile app are deliberately later.',
        ),
        para(
          'Built as a TypeScript monorepo on Next.js, with Supabase PostgreSQL and PostGIS behind it, and every external service reached through a typed adapter so no provider is welded to the product.',
        ),
      ].join(''),
    ),
  ].join(''),
)
