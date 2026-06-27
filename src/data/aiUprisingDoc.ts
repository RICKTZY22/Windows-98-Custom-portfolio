// "The AI Uprising" essay, surfaced as a WordPad document inside the OS at
// C:\My Documents\The AI Uprising.doc. Long-form portfolio content; WordPad
// renders this HTML. Prose deliberately keeps dashes light (commas / colons /
// periods) per the house writing style.

const heading = (text: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif; font-size:21px; font-weight:700; color:#1a3a6b; margin:26px 0 8px; border-bottom:1px solid #c9d6ef; padding-bottom:4px">${text}</div>`

const para = (text: string) => `<p style="margin:0 0 14px">${text}</p>`

const term = (name: string, desc: string, color: string) =>
  `<p style="margin:0 0 11px"><span style="font-weight:700; color:${color}">${name}</span><br><span>${desc}</span></p>`

const VULNS: Array<[string, string]> = [
  ['XSS', 'No HTML sanitization on user-generated content. Any input field that writes text to the DOM without sanitization is an open door for injecting malicious scripts.'],
  ['CSRF', 'Forms submitted without CSRF tokens can be triggered by other sites on behalf of a logged-in user, silently executing actions they never intended.'],
  ['Exposed keys', 'Hardcoded API keys, credentials, and tokens baked directly into frontend code. Anyone who views source gets full access.'],
  ['IDOR', 'Insecure Direct Object References: endpoints that accept an ID parameter with no ownership check. Change the number in the URL, access someone else&#39;s data.'],
  ['No rate limiting', 'Login forms, contact forms, and API calls with no throttle. Wide open to brute force and abuse.'],
  ['Open redirects', 'URL parameters that redirect users without validation, enabling phishing attacks from a trusted domain.'],
  ['Clickjacking', 'Missing Content Security Policy headers and X-Frame-Options, allowing the page to be embedded in a malicious iframe.'],
  ['Sensitive data in localStorage', 'Storing auth tokens or user data in localStorage where any script on the page can read it.'],
  ['Prototype pollution', 'Insecure object merges in JavaScript that let an attacker corrupt the prototype chain and affect the entire application.'],
]

const PRACTICES: Array<[string, string]> = [
  ['HTML sanitization', 'DOMPurify or equivalent on every piece of user-generated content before it touches the DOM.'],
  ['Lazy &amp; chunk loading', 'Code splitting by route. Images loaded only when in the viewport. First paint under a second.'],
  ['GSAP &amp; scroll animations', 'ScrollTrigger, timeline control, pin-based sections. Motion that feels intentional, not janky.'],
  ['Accessibility (a11y)', 'Semantic HTML, ARIA roles, keyboard navigation, screen reader testing. Not an afterthought.'],
  ['CSP headers', 'Content Security Policy configured at the server level to block unauthorized script sources.'],
  ['Responsive architecture', 'Mobile-first, container queries, fluid typography, not just slapping @media breakpoints everywhere.'],
  ['State management', 'Knowing when local state, lifted state, or a global store is the right call. And why it matters for performance.'],
  ['Error boundaries &amp; fallbacks', 'Graceful degradation when things fail. The user sees a useful message, not a blank white screen.'],
  ['Bundle analysis', 'Auditing what ships to the user. Catching accidental inclusion of dev-only libraries. Keeping bundles lean.'],
  ['Token &amp; session security', 'HttpOnly cookies over localStorage, short token lifetimes, refresh rotation, logout that actually works.'],
]

export const aiUprisingDocHtml = [
  '<div style="font-family:Georgia,\'Times New Roman\',serif; margin:-42px -48px; padding:40px 56px 48px; background:#fcfbf7; color:#1d1d1d; line-height:1.62; font-size:15px">',
  '<div style="font-family:Arial,Helvetica,sans-serif; font-size:30px; font-weight:800; line-height:1.15; color:#111">The AI Uprising: What Most Users Are Missing</div>',
  '<div style="font-style:italic; color:#6b6b6b; margin:9px 0 2px; font-size:15px">A developer&#39;s honest take on AI tools, vibe coding, and why foundations still matter</div>',
  '<hr style="border:none; border-top:2px solid #d8d4c4; margin:18px 0 20px">',

  para('AI is cool. You describe what you want, sit back, and watch it build. Landing page done. Login form done. Business website, done. What used to take a junior developer weeks now takes a few minutes. And for millions of people who never touched code before, that feels like freedom.'),
  para('But here&#39;s what most of those users aren&#39;t seeing: the code AI ships is frequently broken in ways that don&#39;t show up until something goes very wrong.'),

  heading('Reality check'),
  para('Hallucination and regression are real, even in top-tier models like Opus 4.8, GPT-5, and Gemini 2.5 Pro. The output looks correct. The page renders. The button works. But underneath, there are gaps that a real developer would catch immediately.'),

  heading('The security gaps nobody talks about'),
  para('When a non-developer asks AI to build a frontend, the AI will often skip the unglamorous parts, the parts that don&#39;t affect how the page looks but determine whether it can be exploited. Here&#39;s what&#39;s being left wide open:'),
  ...VULNS.map(([name, desc]) => term(name, desc, '#b3261e')),
  para('These aren&#39;t edge cases. These are the first things a security-aware developer checks. AI skips them because they&#39;re invisible at first glance, and the person prompting usually doesn&#39;t know to ask.'),

  heading('What a real developer actually brings'),
  para('Frontend engineering in 2026 is not just &ldquo;make it look good and work.&rdquo; A developer who knows their craft brings a stack of practices that no AI will add unprompted:'),
  ...PRACTICES.map(([name, desc]) => term(name, desc, '#1b7a3d')),
  para('None of this shows up in a screenshot. All of it matters the moment the site goes live.'),

  heading('AI is a multiplier, not a replacement'),
  '<div style="border:1px solid #c9c4ad; background:#f3f1e4; padding:16px 20px; margin:8px 0 16px; text-align:center">',
  '<div style="text-transform:uppercase; letter-spacing:2px; font-size:11px; color:#8a8062; font-family:Arial,sans-serif">the real formula</div>',
  '<div style="font-size:21px; font-weight:700; margin:8px 0; font-family:Arial,sans-serif; color:#1a1a1a">Your knowledge &times; AI speed = Actual output quality</div>',
  '<div style="font-style:italic; color:#5a5a5a">If your knowledge is zero, the multiplier does nothing useful.</div>',
  '</div>',
  para('The developers who are thriving right now aren&#39;t avoiding AI. They&#39;re directing it. They know exactly what to ask for, how to specify every layout decision and interaction, and, critically, they know what to look for when the output comes back. They review AI code the way a senior reviews a junior&#39;s PR. They catch the gaps. They fill them.'),
  para('The people who get burned are the ones treating AI as a shortcut around learning. They ship something that works in demo conditions and looks professional. Then a real client&#39;s data gets exposed, or the site goes down under load, or a security researcher runs a basic scan.'),

  '<blockquote style="border-left:4px solid #1a3a6b; margin:18px 0; padding:10px 18px; font-style:italic; color:#333; background:#f7f7f2">',
  '&ldquo;Yes, it&#39;s okay to exaggerate your skills, but make sure you have the foundation to stand on. You can&#39;t be something if you don&#39;t start on something.&rdquo;',
  '<div style="margin-top:10px; font-style:normal; font-weight:700; color:#666; font-size:13px">A real Laravel developer, giving real advice</div>',
  '</blockquote>',

  heading('The honest truth'),
  para('Frontend engineering isn&#39;t dead. But the bar for what &ldquo;shipping a frontend&rdquo; means has permanently moved. A page that looks good is no longer enough. A page that&#39;s fast, accessible, secure, and maintainable, one where the developer can explain every decision in the code, that&#39;s the standard now.'),
  para('AI got us to the starting line faster. That&#39;s genuinely useful. But the race itself still requires a real runner.'),
  para('Study your craft. Learn your prompts. Know the difference between what AI built and what you&#39;d build, and close that gap, one concept at a time. The developers who can&#39;t be replaced by AI are the ones who understand it well enough to use it without being fooled by it.'),
  para('AI keeps getting better. The only correct response is to keep getting better too. Not in competition with it. Alongside it, on top of a foundation that you actually own.'),
  '</div>',
].join('')
