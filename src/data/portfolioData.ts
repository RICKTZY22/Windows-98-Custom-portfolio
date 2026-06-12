export const portfolioData = {
  profile: {
    name: 'Erick',
    role: 'Frontend Developer and Creative Technologist',
    location: 'Philippines',
    headline: 'I build playful, usable interfaces that turn product ideas into polished browser experiences.',
    summary:
      'This Windows 98 desktop is a placeholder-driven portfolio shell. Replace the copy in src/data/portfolioData.ts with your real bio, projects, resume, and links.',
    highlights: [
      'React, TypeScript, and modern frontend architecture',
      'Interactive interfaces with careful visual systems',
      'Portfolio-ready storytelling, UI polish, and responsive design',
    ],
  },
  projects: [
    {
      id: 'win98-portfolio',
      name: 'Windows 98 Portfolio OS',
      fileName: 'portfolio_os.exe',
      stack: ['React', 'TypeScript', 'Vite', '98.css'],
      summary: 'A nostalgic browser desktop with draggable apps, Start menu, and portfolio windows.',
      details:
        'Built as a real-feeling operating system shell rather than a normal landing page. The system keeps app definitions, icons, window state, and portfolio content separate so it can grow phase by phase.',
      links: {
        demo: '#',
        source: '#',
      },
    },
    {
      id: 'project-alpha',
      name: 'Project Alpha',
      fileName: 'alpha_showcase.url',
      stack: ['UI Design', 'Animation', 'React'],
      summary: 'A featured project placeholder for a polished case study.',
      details:
        'Use this slot for a flagship build. Add the problem, your role, the stack, the interaction details, and a measurable result.',
      links: {
        demo: '#',
        source: '#',
      },
    },
    {
      id: 'project-beta',
      name: 'Project Beta',
      fileName: 'beta_notes.txt',
      stack: ['Frontend', 'UX', 'Systems'],
      summary: 'A second project placeholder for product thinking and implementation detail.',
      details:
        'Use this slot for a technical or client-focused project. Keep the writing short enough to scan inside a retro window.',
      links: {
        demo: '#',
        source: '#',
      },
    },
  ],
  resume: {
    downloadUrl: '#',
    sections: [
      {
        title: 'Experience',
        items: [
          'Frontend Developer - built reusable React interfaces and product flows.',
          'Creative Technologist - prototyped interactive browser experiences.',
          'Freelance / Client Work - shipped portfolio, dashboard, and web app surfaces.',
        ],
      },
      {
        title: 'Skills',
        items: ['React', 'TypeScript', 'CSS systems', 'Responsive UI', 'Interaction design', 'Vite'],
      },
      {
        title: 'Currently',
        items: ['Turning this Windows 98 desktop into a memorable portfolio experience.'],
      },
    ],
  },
  contact: {
    email: 'hello@example.com',
    links: [
      { label: 'GitHub', href: '#' },
      { label: 'LinkedIn', href: '#' },
      { label: 'Portfolio Notes', href: '#' },
    ],
  },
  credits: [
    {
      label: 'Windows 98 icon PNGs',
      href: 'https://win98icons.alexmeub.com/',
      note: 'Selected icons are self-hosted in public/icons/win98 for reliability.',
    },
    {
      label: '98.css',
      href: 'https://jdan.github.io/98.css/',
      note: 'Provides the classic Windows 98 component styling; React supplies behavior.',
    },
  ],
}

export type PortfolioProject = (typeof portfolioData.projects)[number]
