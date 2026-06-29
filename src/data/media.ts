/**
 * Media library, sourced from environment variables so the actual media
 * files live OUTSIDE this repo. Host them on Cloudinary, Vercel Blob, etc., and
 * put only the public URLs here.
 *
 * Set the real values in `.env.local` for local dev and in the Vercel dashboard
 * (Settings -> Environment Variables) for production. Only the variable NAMES live
 * in the committed `.env.example`, so a repo visitor never sees your files or links.
 *
 * Each variable is a JSON array of { name, src }. `name` MUST include a real file
 * extension so the Gallery recognizes it:
 *   images -> .png .jpg .jpeg .gif .webp .avif .svg
 *   videos -> .mp4 .webm .mov .mkv .avi .ogg
 *   music  -> .wav .mp3 .mid .ogg
 *
 *   VITE_GALLERY_PHOTOS=[{"name":"trip.jpg","src":"https://host/trip.jpg"}]
 *   VITE_GALLERY_VIDEOS=[{"name":"making-of.mp4","src":"https://host/making-of.mp4"}]
 *   VITE_GALLERY_MUSIC=[{"name":"theme.mp3","src":"https://host/theme.mp3"}]
 */

export type MediaItem = { name: string; src: string }

type RawMediaObject = {
  name?: unknown
  src?: unknown
  url?: unknown
}

function mediaNameFromSrc(src: string, fallback: string): string {
  try {
    const url = new URL(src)
    const fileName = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '')
    return fileName || fallback
  } catch {
    const withoutQuery = src.split(/[?#]/)[0]
    const fileName = withoutQuery.split('/').filter(Boolean).pop()
    return fileName || fallback
  }
}

function normalizeMediaItem(item: unknown, index: number): MediaItem | null {
  if (typeof item === 'string') {
    const src = item.trim()
    if (!src) return null
    return { name: mediaNameFromSrc(src, `media-${index + 1}`), src }
  }
  if (typeof item !== 'object' || item === null) return null

  const raw = item as RawMediaObject
  const src = typeof raw.src === 'string' ? raw.src.trim() : typeof raw.url === 'string' ? raw.url.trim() : ''
  if (!src) return null

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : mediaNameFromSrc(src, `media-${index + 1}`)
  return { name, src }
}

function normalizeMediaValue(value: unknown): MediaItem[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const normalized = normalizeMediaItem(item, index)
      return normalized ? [normalized] : []
    })
  }

  const single = normalizeMediaItem(value, 0)
  return single ? [single] : []
}

export function parseMediaEnv(raw: unknown): MediaItem[] {
  if (typeof raw !== 'string' || raw.trim() === '') return []

  let candidate: unknown = raw.trim()
  try {
    // Some hosting dashboards accidentally add an extra quoting layer. Parse up
    // to twice so '"[{...}]"' still becomes the intended array.
    for (let pass = 0; pass < 2 && typeof candidate === 'string'; pass += 1) {
      candidate = JSON.parse(candidate)
    }
    return normalizeMediaValue(candidate)
  } catch {
    return raw
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .flatMap((entry, index) => {
        const normalized = normalizeMediaItem(entry, index)
        return normalized ? [normalized] : []
      })
  }
}

/** Photos seeded into C:\My Pictures (Gallery + Image Viewer). */
export const galleryPhotos: MediaItem[] = parseMediaEnv(import.meta.env.VITE_GALLERY_PHOTOS)

/** Videos / documentaries seeded into C:\My Videos (Gallery + Video Player). */
export const galleryVideos: MediaItem[] = parseMediaEnv(import.meta.env.VITE_GALLERY_VIDEOS)

/** Audio tracks seeded into C:\My Documents\Music (Media Player). */
export const galleryMusic: MediaItem[] = parseMediaEnv(import.meta.env.VITE_GALLERY_MUSIC)

/**
 * Legacy export still imported by the Video Player. Videos now come from the
 * seeded C:\My Videos folder (built from VITE_GALLERY_VIDEOS), so this stays
 * empty to avoid duplicate playlist rows.
 */
export type LocalMediaItem = { id: string; name: string; kind: 'audio' | 'video'; src: string }
export const localMediaLibrary: LocalMediaItem[] = []
