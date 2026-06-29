import { describe, expect, it } from 'vitest'
import { createInitialFsState } from '../../data/initialFilesystem'
import { createFile, deleteNode, emptyRecycleBin } from '../filesystem'
import { collectLocalMediaRefs, isLocalMediaRef, localMediaRef, unreferencedLocalMediaRefs } from '../localMedia'

describe('local media references', () => {
  it('marks IndexedDB-backed media without storing file bytes in the filesystem', () => {
    const ref = localMediaRef('abc123')

    expect(ref).toBe('indexeddb://win98-local-media/abc123')
    expect(isLocalMediaRef(ref)).toBe(true)
    expect(isLocalMediaRef('https://example.com/photo.jpg')).toBe(false)
  })

  it('keeps local media refs while files are restorable from the Recycle Bin', () => {
    const ref = localMediaRef('photo-1')
    const created = createFile(createInitialFsState(), 'C:\\My Pictures', 'Local Photo.jpg', {
      dataUrl: ref,
      size: 2048,
    })
    const deleted = deleteNode(created.fs, 'C:\\My Pictures\\Local Photo.jpg')

    expect(collectLocalMediaRefs(deleted.fs)).toEqual(new Set([ref]))
    expect(unreferencedLocalMediaRefs(created.fs, deleted.fs)).toEqual([])
  })

  it('marks local media refs for cleanup after the Recycle Bin is emptied', () => {
    const ref = localMediaRef('video-1')
    const created = createFile(createInitialFsState(), 'C:\\My Videos', 'Local Clip.mp4', {
      dataUrl: ref,
      size: 4096,
    })
    const deleted = deleteNode(created.fs, 'C:\\My Videos\\Local Clip.mp4')
    const emptied = emptyRecycleBin(deleted.fs)

    expect(unreferencedLocalMediaRefs(deleted.fs, emptied)).toEqual([ref])
  })
})
