/**
 * Local media library for Windows Media Player / Video Player.
 *
 * TO ADD YOUR OWN VIDEOS/MUSIC: drop the files into `public/media/user/` and list
 * them here or as virtual files in initialFilesystem.ts. `src` is the URL path
 * under public/, e.g. '/media/user/my-clip.mp4'.
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
