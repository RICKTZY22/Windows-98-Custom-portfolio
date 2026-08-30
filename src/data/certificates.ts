export type CertificateRecord = {
  id: string
  title: string
  issuer: string
  credentialId: string
  category: string
  passedOn: string
  ranking: string
  verificationUrl: string
  summary: string
  skills: string[]
}

export const certificates: CertificateRecord[] = [
  {
    id: 'testdome-html-css-055d4e78e44f474e9fe2363afb43007b',
    title: 'HTML/CSS Certificate',
    issuer: 'TestDome',
    credentialId: '055d4e78e44f474e9fe2363afb43007b',
    category: 'Frontend Skills Assessment',
    passedOn: 'Jun 30, 2026',
    ranking: 'Top 10%',
    verificationUrl: 'https://www.testdome.com/certificates/055d4e78e44f474e9fe2363afb43007b',
    summary:
      'Public TestDome certificate for HTML/CSS, showing frontend markup and styling fundamentals through a work-sample assessment.',
    skills: ['HTML', 'CSS3', 'Responsive UI', 'Frontend Fundamentals'],
  },
  {
    id: 'testdome-react-46851c6416814056ad86b695ca1f1aed',
    title: 'React Certificate',
    issuer: 'TestDome',
    credentialId: '46851c6416814056ad86b695ca1f1aed',
    category: 'Frontend Skills Assessment',
    passedOn: 'Jun 30, 2026',
    ranking: 'Top 10%',
    verificationUrl: 'https://www.testdome.com/certificates/46851c6416814056ad86b695ca1f1aed',
    summary:
      'Public TestDome certificate for React, verifying component-based frontend knowledge through a practical assessment.',
    skills: ['React', 'Components', 'State Management', 'Frontend Architecture'],
  },
  {
    id: 'testdome-javascript-1e6befb4b1d84435ab5e54b1412225c8',
    title: 'JavaScript Certificate',
    issuer: 'TestDome',
    credentialId: '1e6befb4b1d84435ab5e54b1412225c8',
    category: 'Programming Skills Assessment',
    passedOn: 'Jun 30, 2026',
    ranking: 'Top 25%',
    verificationUrl: 'https://www.testdome.com/certificates/1e6befb4b1d84435ab5e54b1412225c8',
    summary:
      'Public TestDome certificate for JavaScript, verifying core programming and problem-solving knowledge.',
    skills: ['JavaScript', 'Programming Fundamentals', 'Problem Solving', 'DOM-ready Logic'],
  },
  {
    id: 'testdome-nodejs-45d6dcefeece468688cd5228ac7bdbcf',
    title: 'Node.js Certificate',
    issuer: 'TestDome',
    credentialId: '45d6dcefeece468688cd5228ac7bdbcf',
    category: 'Backend Skills Assessment',
    passedOn: 'Aug 30, 2026',
    ranking: 'Top 10%',
    verificationUrl: 'https://www.testdome.com/certificates/45d6dcefeece468688cd5228ac7bdbcf',
    summary:
      'Public TestDome certificate for Node.js, verifying backend JavaScript runtime knowledge through a practical assessment.',
    skills: ['Node.js', 'JavaScript Runtime', 'Backend Fundamentals', 'Server-side Logic'],
  },
  {
    id: 'testdome-expressjs-d0e4610a2adb47728108463e03264480',
    title: 'Express.js Certificate',
    issuer: 'TestDome',
    credentialId: 'd0e4610a2adb47728108463e03264480',
    category: 'Backend Skills Assessment',
    passedOn: 'Aug 30, 2026',
    ranking: 'Top 10%',
    verificationUrl: 'https://www.testdome.com/certificates/d0e4610a2adb47728108463e03264480',
    summary:
      'Public TestDome certificate for Express.js, verifying Express.js and Node.js backend knowledge through a practical assessment.',
    skills: ['Express.js', 'Node.js', 'Backend Routing', 'API Fundamentals'],
  },
]
