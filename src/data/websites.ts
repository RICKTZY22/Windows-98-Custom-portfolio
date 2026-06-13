/**
 * The "Portfolio Internet" — every website that exists inside the simulated OS.
 * Real iframes to arbitrary sites don't work (modern sites block framing), so
 * Internet Explorer renders these fake sites instead.
 *
 * TO ADD YOUR OWN YOUTUBE VIDEOS: put the 11-character video id from the real
 * YouTube URL (youtube.com/watch?v=XXXXXXXXXXX) into `youtubeId` below. Slots
 * without a youtubeId show a "coming soon" placeholder.
 */

export type FakeVideo = {
  id: string
  title: string
  author: string
  views: string
  uploaded: string
  /** Real YouTube video id — when set, the video plays inside IE via the official embed. */
  youtubeId?: string
}

export const youtubeVideos: FakeVideo[] = [
  {
    id: 'video-1',
    title: 'My first video — coming soon',
    author: 'John Erick Mendoza',
    views: '1,998 views',
    uploaded: '2026',
    // youtubeId: 'XXXXXXXXXXX',
  },
  {
    id: 'video-2',
    title: 'Portfolio OS devlog — coming soon',
    author: 'John Erick Mendoza',
    views: '98 views',
    uploaded: '2026',
  },
  {
    id: 'video-3',
    title: 'PLMUN Nexus preview — coming soon',
    author: 'John Erick Mendoza',
    views: '256 views',
    uploaded: '2026',
  },
  {
    id: 'video-4',
    title: 'Between Two Ruins teaser — coming soon',
    author: 'John Erick Mendoza',
    views: '512 views',
    uploaded: '2026',
  },
]

export type FakeSite = {
  host: string
  title: string
  description: string
}

/** Sites listed by the fake Google and on the IE home page. */
export const fakeSites: FakeSite[] = [
  {
    host: 'portfolio.local',
    title: 'Erick — Portfolio 98',
    description: 'The home page of this Windows 98 portfolio. About me, contact, and credits.',
  },
  {
    host: 'plmunnexus.com',
    title: 'PLMUN Nexus',
    description: 'A project by John Erick Mendoza. Under construction — coming 2026.',
  },
  {
    host: 'betweentworuins.com',
    title: 'Between Two Ruins',
    description: 'A project by John Erick Mendoza. Under construction — coming 2026.',
  },
  {
    host: 'youtube.com',
    title: 'YouTube — 1998 Edition',
    description: 'Videos by John Erick Mendoza, served over the Portfolio Ethernet.',
  },
  {
    host: 'google.com',
    title: 'Google',
    description: 'Search the entire Portfolio Internet. All five websites of it.',
  },
]
