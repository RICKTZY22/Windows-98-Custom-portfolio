import './GalleryApp.css'
import { useMemo, useState } from 'react'
import type { FsNode } from '../../types'
import { win98Icons } from '../../data/icons'
import { extensionOf, formatSize, listDirectory } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

// BMP is intentionally excluded: Paint saves .bmp files into C:\My Documents\Paint
// (browse them in the file manager), so they don't clutter the photo gallery.
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'avi', 'webm', 'mov', 'mkv', 'ogg'])

const PICTURES_DIR = 'C:\\My Pictures'
const VIDEOS_DIR = 'C:\\My Videos'

type Tab = 'pictures' | 'videos'

export function GalleryApp() {
  const { state, openNode } = useOs()
  const [tab, setTab] = useState<Tab>('pictures')
  const [selected, setSelected] = useState<string>()

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

  return (
    <div className="app-content gallery-app">
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
        {items.length === 0 ? (
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
              <button
                key={node.path}
                type="button"
                className={`gallery-tile ${selected === node.path ? 'selected' : ''}`}
                title={node.name}
                onClick={() => setSelected(node.path)}
                onDoubleClick={() => openNode(node.path)}
              >
                <span className="gallery-thumb">
                  {tab === 'pictures' && node.dataUrl ? (
                    <img src={node.dataUrl} alt={node.name} />
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
