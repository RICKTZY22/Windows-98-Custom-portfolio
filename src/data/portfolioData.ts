const inventoryFrontendStack = [
  'React 18',
  'Vite 5',
  'Tailwind CSS 3',
  'JavaScript / JSX',
  'React Router DOM',
  'Zustand',
  'Axios',
  'WebSocket chat client',
  'Phosphor Icons',
  'Rive',
  'GSAP',
  'Motion',
  'Lottie React',
  'Auto Animate',
  'Recharts',
  'date-fns',
  'qrcode.react',
  'jsPDF',
  'jspdf-autotable',
  'file-saver',
  'Inter Variable',
  'Plus Jakarta Sans',
]

const inventoryBackendStack = [
  'Python',
  'Django 6',
  'Django REST Framework',
  'SimpleJWT',
  'PyJWT',
  'Django Channels',
  'Daphne ASGI',
  'channels-redis',
  'PostgreSQL',
  'SQLite local dev',
  'Redis',
  'Pillow',
  'django-cors-headers',
  'django-ratelimit',
  'drf-spectacular',
  'WhiteNoise',
  'Gunicorn',
  'python-dotenv',
  'dj-database-url',
]

const inventoryQualityStack = [
  'Vitest',
  'React Testing Library',
  'jest-dom',
  'jsdom',
  'ESLint',
  'Django test runner',
  'GitHub Actions CI',
  'pip-audit',
  'CodeQL Advanced',
  'Render',
  'Node 22 CI',
  'Python 3.12 CI',
  'PostgreSQL 16 CI',
]

const aiAssistantStack = [
  'Local Ollama support',
  'Gemini via google-genai',
  'qwen2.5:7b-instruct docs',
  'Read-only messaging assistant',
]

const educationItems = [
  'Las Pinas National High School - Junior High School, 2017-2021',
  'Holy Rosary Academy - HUMSS Strand, 2021-2023',
  'Pamantasan ng Lungsod ng Muntinlupa (PLMun) - BS Computer Science, 2023-2027',
]

const contactPlaceholders = {
  email: 'john.erick.mendoza@example.com',
  github: 'Add GitHub URL',
  linkedin: 'Add LinkedIn URL',
  portfolio: 'portfolio.local',
}

const resumeDocumentContent = [
  'JOHN ERICK MENDOZA',
  'BS Computer Science Student | Frontend Developer | Full-Stack Capstone Developer',
  'Muntinlupa / Las Pinas, Philippines',
  `Email: ${contactPlaceholders.email}`,
  `GitHub: ${contactPlaceholders.github} | LinkedIn: ${contactPlaceholders.linkedin}`,
  `Portfolio: ${contactPlaceholders.portfolio}`,
  '',
  'PROFESSIONAL SUMMARY',
  'BS Computer Science student and frontend-focused full-stack developer building practical systems, polished React interfaces, and creative browser experiences. Experienced with inventory/request management workflows, role-based dashboards, JWT authentication, REST APIs, WebSockets, reporting, PDF exports, and animation-heavy storytelling interfaces.',
  '',
  'CORE SKILLS',
  `Frontend: ${inventoryFrontendStack.join(', ')}`,
  `Backend: ${inventoryBackendStack.join(', ')}`,
  `AI / Assistant: ${aiAssistantStack.join(', ')}`,
  `Testing / Quality: ${inventoryQualityStack.join(', ')}`,
  '',
  'PROJECT EXPERIENCE',
  'PLMun Inventory Nexus - Full-Stack Capstone Developer',
  '- Built a capstone inventory/request management system with React, Vite, Tailwind CSS, Django REST Framework, PostgreSQL, JWT authentication, role-based access control, and dashboard reporting.',
  '- Implemented request workflows, analytics, QR code rendering, PDF/export tools, REST API integration, and real-time WebSocket chat support.',
  '- Added AI-assisted read-only messaging support through local Ollama and Gemini-compatible assistant integrations.',
  '',
  'Canlas Inventory System - Full-Stack Developer',
  '- Developed a production-minded inventory platform focused on reliable item tracking, request handling, user roles, reporting, API documentation, and deployment-ready configuration.',
  '- Used Django Channels, Daphne, optional Redis channel layers, drf-spectacular, WhiteNoise, Gunicorn, Render deployment config, GitHub Actions CI, pip-audit, and CodeQL security scanning.',
  '',
  'Between Two Ruins - Visual Novel / Interactive Book Developer',
  '- Created a browser-based visual novel experience using React, GSAP, and ScrollTrigger.',
  '- Focused on cinematic scene pacing, scroll-driven transitions, reusable story components, and a smooth reading flow.',
  '',
  'Windows 98 Portfolio Edition - Portfolio OS Developer',
  '- Built a browser-based Windows 98-style portfolio OS with startup flow, desktop icons, Explorer, MS-DOS Prompt, Notepad, WordPad, Paint, networking, media apps, virtual filesystem, recovery behavior, themes, sounds, and movable windows.',
  '- Structured portfolio content as files, shortcuts, apps, and simulated operating system behavior instead of a normal landing page.',
  '',
  'EDUCATION',
  ...educationItems.map((item) => `- ${item}`),
  '',
  'CREDITS',
  '- Project ownership, portfolio direction, resume content, and named systems: John Erick Mendoza.',
  '- Portfolio OS implementation assistance and QA: OpenAI Codex.',
  '- Planning/refactor assistance credited by request: Claude Fable and Opus 4.8.',
].join('\n')

export const portfolioData = {
  profile: {
    name: 'John Erick Mendoza',
    role: 'BSCS Student, Frontend Developer, and Full-Stack Capstone Developer',
    location: 'Muntinlupa / Las Pinas, Philippines',
    headline: 'I build practical inventory systems, animated story experiences, and a Windows 98-style portfolio OS.',
    summary:
      'I am a BS Computer Science student from PLMun who likes turning real project ideas into working browser software. My work focuses on React interfaces, Django-backed systems, inventory/request workflows, dashboards, WebSocket features, and creative interactive experiences like Between Two Ruins and this Windows 98 Portfolio Edition.',
    highlights: [
      'Built PLMun Inventory Nexus and Canlas Inventory System as full-stack capstone-style systems',
      'Works with React, Vite, Tailwind CSS, Zustand, Django REST Framework, PostgreSQL, JWT auth, and WebSockets',
      'Creates polished UI with GSAP, Motion, Lottie, Rive, Recharts, QR codes, and PDF export workflows',
      'Developed Between Two Ruins, an interactive visual novel built with React, GSAP, and ScrollTrigger',
    ],
  },
  projects: [
    {
      id: 'plmun-inventory-nexus',
      name: 'PLMun Inventory Nexus',
      fileName: 'plmun_inventory_nexus.url',
      stack: [...inventoryFrontendStack, ...inventoryBackendStack, ...aiAssistantStack, ...inventoryQualityStack],
      summary: 'Full-stack inventory/request management system with dashboards, auth, WebSockets, reports, QR codes, and AI assistant support.',
      details:
        'Built by John Erick Mendoza as a full-stack capstone system using React 18, Vite, Tailwind CSS, Zustand, Axios, Django 6, Django REST Framework, JWT auth with cookie refresh flow, PostgreSQL, Django Channels, and deployment-ready environment configuration. The system includes role-based access control, inventory/request workflows, dashboard analytics, QR code rendering, PDF exports, real-time WebSocket chat, and an AI-assisted read-only messaging assistant.',
      links: {
        demo: '#',
        source: '#',
      },
    },
    {
      id: 'canlas-inventory-system',
      name: 'Canlas Inventory System',
      fileName: 'canlas_inventory_system.url',
      stack: [
        'React',
        'Django REST Framework',
        'PostgreSQL',
        'Django Channels',
        'JWT auth',
        'GitHub Actions',
        'CodeQL',
        'Render',
      ],
      summary: 'Production-minded inventory platform focused on item tracking, requests, reporting, CI/CD, testing, and security scanning.',
      details:
        'Built by John Erick Mendoza as an inventory/request platform using REST APIs, WebSockets, PostgreSQL in production and CI, SQLite-friendly local development, Redis-backed channel layers, drf-spectacular Swagger schema, WhiteNoise, Gunicorn, Render deployment config, GitHub Actions, pip-audit, CodeQL Advanced, Vitest, React Testing Library, and the Django test runner.',
      links: {
        demo: '#',
        source: '#',
      },
    },
    {
      id: 'between-two-ruins',
      name: 'Between Two Ruins',
      fileName: 'between_two_ruins.exe',
      stack: ['React', 'GSAP', 'ScrollTrigger', 'JavaScript', 'Interactive Storytelling'],
      summary: 'A visual novel / interactive book with animated scenes and scroll-driven reading flow.',
      details:
        'Built by John Erick Mendoza with React and GSAP ScrollTrigger to create a storybook-style visual novel experience. The project focuses on cinematic transitions, scroll-based scene pacing, reusable story components, and a polished browser reading experience.',
      links: {
        demo: '#',
        source: '#',
      },
    },
    {
      id: 'win98-portfolio',
      name: 'Windows 98 Portfolio OS',
      fileName: 'portfolio_os.exe',
      stack: ['React', 'TypeScript', 'Vite', '98.css', 'Virtual filesystem'],
      summary: 'A nostalgic browser desktop with startup, apps, Explorer, Paint, terminal, networking, and portfolio files.',
      details:
        'Built as a real-feeling operating system shell rather than a normal landing page. The system keeps app definitions, icons, window state, virtual files, recovery behavior, networking, themes, sounds, and portfolio content separated so it can grow phase by phase.',
      links: {
        demo: '#',
        source: '#',
      },
    },
  ],
  resume: {
    downloadUrl: '#',
    documentFileName: 'Resume.doc',
    documentContent: resumeDocumentContent,
    education: educationItems,
    sections: [
      {
        title: 'Education',
        items: educationItems,
      },
      {
        title: 'Projects',
        items: [
          'PLMun Inventory Nexus - full-stack capstone with REST APIs, WebSockets, JWT auth, dashboards, reports, QR codes, PDF export, and AI assistant support.',
          'Canlas Inventory System - production-style inventory platform with CI/CD, testing, PostgreSQL, Render deployment config, security scanning, and API documentation.',
          'Between Two Ruins - React and GSAP ScrollTrigger interactive visual novel with animated reading scenes.',
        ],
      },
      {
        title: 'Skills',
        items: [
          'Frontend: React, Vite, Tailwind CSS, Zustand, Axios, GSAP, Motion, Lottie, Recharts',
          'Backend: Python, Django, Django REST Framework, Django Channels, PostgreSQL, Redis, Gunicorn',
          'Quality: Vitest, React Testing Library, Django tests, ESLint, GitHub Actions, pip-audit, CodeQL',
        ],
      },
    ],
  },
  contact: {
    email: contactPlaceholders.email,
    location: 'Muntinlupa / Las Pinas, Philippines',
    availability: 'Open to internship, junior frontend, and full-stack project opportunities.',
    summary:
      'Best contact details are ready to swap once you give the final email, GitHub, LinkedIn, and portfolio links. For now, this portfolio uses safe placeholders so no fake personal contact info is published.',
    links: [
      { label: 'GitHub - add real URL', href: '#' },
      { label: 'LinkedIn - add real URL', href: '#' },
      { label: 'Portfolio Notes', href: '#' },
    ],
  },
  credits: [
    {
      section: 'Portfolio & tooling',
      label: 'John Erick Mendoza',
      href: '#john-erick-mendoza',
      note: 'Portfolio owner, project developer, resume subject, and creator of PLMun Inventory Nexus, Canlas Inventory System, Between Two Ruins, and the Windows 98 Portfolio Edition direction.',
    },
    {
      section: 'Portfolio & tooling',
      label: 'OpenAI Codex',
      href: 'https://openai.com/',
      note: 'AI coding assistance for implementation support, QA, and Windows 98 Portfolio OS iteration.',
    },
    {
      section: 'Portfolio & tooling',
      label: 'Claude Fable / Opus 4.8',
      href: 'https://www.anthropic.com/',
      note: 'Planning and refactor assistance credited by request for the portfolio OS build process.',
    },
    {
      section: 'Portfolio & tooling',
      label: 'Windows 98 icon PNGs',
      href: 'https://win98icons.alexmeub.com/',
      note: 'Selected icons are self-hosted in public/icons/win98 for reliability.',
    },
    {
      section: 'Portfolio & tooling',
      label: '98.css',
      href: 'https://jdan.github.io/98.css/',
      note: 'Provides the classic Windows 98 component styling; React supplies behavior.',
    },
    {
      section: 'Games & DOS emulation',
      label: 'id Software',
      href: 'https://www.idsoftware.com/',
      note: 'Creators of DOOM (1993) and Wolfenstein 3D (1992) — John Carmack, John Romero, Tom Hall, Sandy Petersen, Adrian Carmack, Kevin Cloud, and composer Bobby Prince. The free shareware episodes are included here in tribute.',
    },
    {
      section: 'Games & DOS emulation',
      label: 'Bethesda Softworks / ZeniMax Media',
      href: 'https://bethesda.net/',
      note: 'Current owners of id Software and the DOOM and Wolfenstein franchises (now part of Microsoft). All game names, trademarks, and assets belong to them.',
    },
    {
      section: 'Games & DOS emulation',
      label: 'Apogee Software / 3D Realms',
      href: 'https://3drealms.com/',
      note: 'Original 1992 shareware publisher of Wolfenstein 3D.',
    },
    {
      section: 'Games & DOS emulation',
      label: 'js-dos',
      href: 'https://js-dos.com/',
      note: 'In-browser DOS player by Alexander Guryanov (caiiiycuk). Runs the games entirely client-side via WebAssembly; the .jsdos bundles are self-hosted in public/games.',
    },
    {
      section: 'Games & DOS emulation',
      label: 'DOSBox',
      href: 'https://www.dosbox.com/',
      note: 'The DOS emulator core that js-dos compiles to WebAssembly to run the original MS-DOS executables.',
    },
    {
      section: 'Games & DOS emulation',
      label: 'Internet Archive',
      href: 'https://archive.org/',
      note: 'The MS-DOS software collection at archive.org preserves and provides the shareware game files used to build the bundles.',
    },
    {
      section: 'Games & DOS emulation',
      label: 'DOS.Zone',
      href: 'https://dos.zone/',
      note: 'Community MS-DOS games portal (built on js-dos) referenced while sourcing and configuring the games.',
    },
  ],
}

export type PortfolioProject = (typeof portfolioData.projects)[number]
