import { useEffect, useState } from 'react'
import { getLocalMediaBlob, isLocalMediaRef } from './localMedia'

export function useResolvedMediaUrl(src: string | undefined): string | undefined {
  const [resolved, setResolved] = useState<{ src: string; url: string }>()

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined

    if (!src || !isLocalMediaRef(src)) {
      return undefined
    }

    void getLocalMediaBlob(src)
      .then((blob) => {
        if (cancelled) return
        if (!blob) {
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setResolved({ src, url: objectUrl })
      })
      .catch(() => {
        // Missing local media behaves like an unloaded file.
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (!src || !isLocalMediaRef(src)) return src
  return resolved?.src === src ? resolved.url : undefined
}
