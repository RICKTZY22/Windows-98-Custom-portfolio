/**
 * Media library, sourced from environment variables so the actual photo/video
 * files live OUTSIDE this repo. Host them on Cloudinary, Vercel Blob, etc., and
 * put only the public URLs here.
 *
 * Set the real values in `.env.local` for local dev and in the Vercel dashboard
 * (Settings -> Environment Variables) for production. Only the variable NAMES live
 * in the committed `.env.example`, so a repo visitor never sees your files or links.
 *
 * Each variable is a JSON array of { name, src }. `name` MUST include a real file
 * extension so the Gallery recognizes it:
 *   images -> .png .jpg .jpeg .gif        videos -> .mp4 .webm .mov .mkv .avi .ogg
 *
 *   VITE_GALLERY_PHOTOS=[{"name":"trip.jpg","src":"https://host/trip.jpg"}]
 *   VITE_GALLERY_VIDEOS=[{"name":"making-of.mp4","src":"https://host/making-of.mp4"}]
 */

export type MediaItem = { name: string; src: string }

function parseMediaEnv(raw: unknown): MediaItem[] {
  if (typeof raw !== 'string' || raw.trim() === '') return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is MediaItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as MediaItem).name === 'string' &&
        typeof (item as MediaItem).src === 'string',
    )
  } catch {
    return []
  }
}

/** Photos seeded into C:\My Pictures (Gallery + Image Viewer). */
export const galleryPhotos: MediaItem[] = parseMediaEnv(import.meta.env.VITE_GALLERY_PHOTOS)

/** Videos / documentaries seeded into C:\My Videos (Gallery + Video Player). */
export const galleryVideos: MediaItem[] = parseMediaEnv(import.meta.env.VITE_GALLERY_VIDEOS)

/**
 * Legacy export still imported by the Video Player. Videos now come from the
 * seeded C:\My Videos folder (built from VITE_GALLERY_VIDEOS), so this stays
 * empty to avoid duplicate playlist rows.
 */
export type LocalMediaItem = { id: string; name: string; kind: 'audio' | 'video'; src: string }
export const localMediaLibrary: LocalMediaItem[] = []
