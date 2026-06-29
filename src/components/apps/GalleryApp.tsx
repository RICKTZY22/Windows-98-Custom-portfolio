import './GalleryApp.css'
import { useMemo, useState, type DragEvent } from 'react'
import type { FsNode } from '../../types'
import { win98Icons } from '../../data/icons'
import { extensionOf, formatSize, listDirectory } from '../../os/filesystem'
import { useOs } from '../../os/useOs'
import { driverFailureBox, driverHealthy, missingDriverFiles } from '../../os/systemHealth'
import { deleteLocalMediaRef, storeLocalMediaFile } from '../../os/localMedia'
import { useResolvedMediaUrl } from '../../os/useResolvedMediaUrl'

// BMP is intentionally excluded: Paint saves .bmp files into C:\My Documents\Paint
// (browse them in the file manager), so they don't clutter the photo gallery.
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'avi', 'webm', 'mov', 'mkv', 'ogg'])

const PICTURES_DIR = 'C:\\My Pictures'
const VIDEOS_DIR = 'C:\\My Videos'
const MUSIC_DIR = 'C:\\My Documents\\Music'

type Tab = 'pictures' | 'videos'

type ImportResult = {
  added: number
  skipped: number
  failed: number
}

function destinationForFile(file: File): string | null {
  const ext = extensionOf(file.name)
  if (file.type.startsWith('image/')) return PICTURES_DIR
  if (file.type.startsWith('audio/')) return MUSIC_DIR
  if (file.type.startsWith('video/')) return VIDEOS_DIR
  if (IMAGE_EXTENSIONS.has(ext)) return PICTURES_DIR
  if (['wav', 'mp3', 'mid'].includes(ext)) return MUSIC_DIR
  if (VIDEO_EXTENSIONS.has(ext)) return VIDEOS_DIR
  return null
}

function uniqueImportName(existingNames: Set<string>, desired: string): string {
  if (!existingNames.has(desired.toLowerCase())) {
    existingNames.add(desired.toLowerCase())
    return desired
  }
  const ext = extensionOf(desired)
  const stem = ext ? desired.slice(0, desired.length - ext.length - 1) : desired
  for (let index = 2; index < 1000; index += 1) {
    const candidate = ext ? `${stem} (${index}).${ext}` : `${stem} (${index})`
    if (!existingNames.has(candidate.toLowerCase())) {
      existingNames.add(candidate.toLowerCase())
      return candidate
    }
  }
  return desired
}

function GalleryTile({
  node,
  tab,
  selected,
  onSelect,
  onOpen,
}: {
  node: FsNode
  tab: Tab
  selected: boolean
  onSelect(): void
  onOpen(): void
}) {
  const thumbSrc = useResolvedMediaUrl(tab === 'pictures' ? node.dataUrl : undefined)

  return (
    <button
      type="button"
      className={`gallery-tile ${selected ? 'selected' : ''}`}
      title={node.name}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <span className="gallery-thumb">
        {tab === 'pictures' && thumbSrc ? (
          <img src={thumbSrc} alt={node.name} />
        ) : (
          <img
            className="gallery-thumb-icon"
            src={win98Icons[tab === 'pictures' ? 'imageFile' : 'videoFile']}
            alt=""
          />
        )}
        {tab === 'videos' && <span className="gallery-play" aria-hidden="true">▶</span>}
      </span>
      <span className="gallery-name">{node.name}</span>
    </button>
  )
}

export function GalleryApp() {
  const { state, openNode, showMessageBox, notify, fsOps } = useOs()
  const [tab, setTab] = useState<Tab>('pictures')
  const [selected, setSelected] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const videoDriverReady = driverHealthy(state.fs, 'video')

  const pictures = useMemo(
    () =>
      listDirectory(state.fs, PICTURES_DIR).filter(
        (node) => node.kind === 'file' && IMAGE_EXTENSIONS.has(extensionOf(node.name)),
      ),
    [state.fs],
  )
  const videos = useMemo(
    () =>
      listDirectory(state.fs, VIDEOS_DIR).filter(
        (node) => node.kind === 'file' && VIDEO_EXTENSIONS.has(extensionOf(node.name)),
      ),
    [state.fs],
  )

  const items: FsNode[] = tab === 'pictures' ? pictures : videos
  const selectedNode = items.find((node) => node.path === selected)

  async function importFiles(files: FileList | File[]): Promise<ImportResult> {
    const result: ImportResult = { added: 0, skipped: 0, failed: 0 }
    const existingNames = new Map<string, Set<string>>()
    for (const file of Array.from(files)) {
      const destination = destinationForFile(file)
      if (!destination) {
        result.skipped += 1
        continue
      }
      try {
        const stored = await storeLocalMediaFile(file)
        let names = existingNames.get(destination)
        if (!names) {
          names = new Set(listDirectory(state.fs, destination).map((node) => node.name.toLowerCase()))
          existingNames.set(destination, names)
        }
        const name = uniqueImportName(names, file.name)
        const error = fsOps.createFile(destination, name, { dataUrl: stored.ref, size: stored.size })
        if (error) {
          await deleteLocalMediaRef(stored.ref)
          result.failed += 1
        } else {
          result.added += 1
        }
      } catch {
        result.failed += 1
      }
    }
    return result
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    const files = event.dataTransfer.files
    if (!files.length || importing) return
    setImporting(true)
    void importFiles(files)
      .then((result) => {
        if (result.added > 0) {
          notify('Files imported', `${result.added} file(s) were saved to the local portfolio disk.`)
          if (result.skipped || result.failed) {
            showMessageBox({
              title: 'Import Complete',
              message: `${result.added} file(s) imported.`,
              detail: `${result.skipped} unsupported file(s), ${result.failed} failed file(s).\n\nLarge files are stored in this browser only using IndexedDB; localStorage keeps only small virtual file records.`,
              icon: 'info',
              buttons: ['ok'],
            })
          }
        } else {
          showMessageBox({
            title: 'Import Failed',
            message: 'No supported media files were imported.',
            detail: 'Drop JPG, PNG, GIF, WebP, AVIF, SVG, MP4, WebM, MOV, MKV, AVI, OGG, MP3, WAV, or MID files.',
            icon: 'warning',
            buttons: ['ok'],
          })
        }
      })
      .finally(() => setImporting(false))
  }

  return (
    <div
      className={`app-content gallery-app ${dragging ? 'is-dragging-files' : ''}`}
      data-local-media-dropzone="true"
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setDragging(true)
      }}
      onDragLeave={(event) => {
        const nextTarget = event.relatedTarget
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setDragging(false)
        }
      }}
      onDrop={handleDrop}
    >
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Help</li>
      </ul>
      <div className="toolbar gallery-toolbar">
        <button
          type="button"
          className={tab === 'pictures' ? 'pressed' : ''}
          onClick={() => {
            setTab('pictures')
            setSelected(undefined)
          }}
        >
          <img src={win98Icons.imageFile} alt="" /> Pictures ({pictures.length})
        </button>
        <button
          type="button"
          className={tab === 'videos' ? 'pressed' : ''}
          onClick={() => {
            setTab('videos')
            setSelected(undefined)
          }}
        >
          <img src={win98Icons.videoFile} alt="" /> Videos ({videos.length})
        </button>
      </div>
      <div className="sunken-panel gallery-grid-wrap">
        <div className="gallery-drop-hint" aria-live="polite">
          {importing
            ? 'Importing files to this browser...'
            : dragging
              ? 'Drop media here to save it locally.'
              : 'Drag images, videos, or audio here to add them to the local portfolio disk.'}
        </div>
        {!videoDriverReady ? (
          <div className="gallery-empty">
            <img src={win98Icons.display} alt="" />
            <p>VGA Display: Driver Missing</p>
            <p className="gallery-hint">
              Gallery previews are unavailable until Recovery Mode restores the simulated video driver.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="gallery-empty">
            <img src={win98Icons[tab === 'pictures' ? 'imageFile' : 'videoFile']} alt="" />
            <p>{tab === 'pictures' ? 'No pictures yet.' : 'No videos yet.'}</p>
            <p className="gallery-hint">
              {tab === 'pictures'
                ? 'Save images to C:\\My Pictures (for example from Paint) and they show up here.'
                : 'Drop clips into C:\\My Videos and they show up here.'}
            </p>
          </div>
        ) : (
          <div className="gallery-grid">
            {items.map((node) => (
              <GalleryTile
                key={node.path}
                node={node}
                tab={tab}
                selected={selected === node.path}
                onSelect={() => setSelected(node.path)}
                onOpen={() => {
                  if (!videoDriverReady) {
                    showMessageBox(driverFailureBox('video', 'My Pictures', missingDriverFiles(state.fs, 'video')))
                    return
                  }
                  openNode(node.path)
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{tab === 'pictures' ? PICTURES_DIR : VIDEOS_DIR}</p>
        <p className="status-bar-field">
          {selectedNode ? `${selectedNode.name} — ${formatSize(selectedNode.size) || '0 KB'}` : `${items.length} item(s)`}
        </p>
        <p className="status-bar-field">Double-click to open</p>
      </div>
    </div>
  )
}
