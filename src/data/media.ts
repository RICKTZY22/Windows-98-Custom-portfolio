/**
 * Local media library for Windows Media Player (NOT YouTube — those live in
 * src/data/websites.ts and play inside Internet Explorer).
 *
 * TO ADD YOUR OWN VIDEOS/MUSIC: drop the files into `public/media/` and list
 * them here. `src` is the URL path under public/, e.g. '/media/my-clip.mp4'.
 */

export type LocalMediaItem = {
  id: string
  name: string
  kind: 'audio' | 'video'
  src: string
}

export const localMediaLibrary: LocalMediaItem[] = [
  // { id: 'clip-1', name: 'My Clip.mp4', kind: 'video', src: '/media/my-clip.mp4' },
]
