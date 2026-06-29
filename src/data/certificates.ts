export type CertificateRecord = {
  id: string
  title: string
  issuer: string
  credentialId: string
  category: string
  verificationUrl: string
  summary: string
  skills: string[]
}

export const certificates: CertificateRecord[] = [
  {
    id: 'testdome-1166f89ad4d04a1da9422ef61899f689',
    title: 'TestDome Certificate',
    issuer: 'TestDome',
    credentialId: '1166f89ad4d04a1da9422ef61899f689',
    category: 'Skills Assessment',
    verificationUrl: 'https://www.testdome.com/certificates/1166f89ad4d04a1da9422ef61899f689',
    summary:
      'Public certificate verification link for an online skills assessment. Open the certificate to view the exact test details and verification page.',
    skills: ['Problem Solving', 'Programming Fundamentals', 'Technical Assessment'],
  },
]
