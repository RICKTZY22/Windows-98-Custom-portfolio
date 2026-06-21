import './ImageViewerApp.css'
import { useEffect, useState } from 'react'
import type { AppProps, FsNode } from '../../types'
import { win98Icons } from '../../data/icons'
import { baseName, extensionOf, formatSize, getNode, listDirectory, parentPath } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

const IMAGE_EXTENSIONS = new Set(['bmp', 'png', 'jpg', 'jpeg', 'gif'])

function isImageFile(node: FsNode): boolean {
  return node.kind === 'file' && IMAGE_EXTENSIONS.has(extensionOf(node.name))
}

export function ImageViewerApp({ windowId, payload }: AppProps) {
  const { state, openApp, setWindowTitle, showMessageBox } = useOs()
  const [currentPath, setCurrentPath] = useState(payload?.filePath ?? '')
  const [fitToWindow, setFitToWindow] = useState(true)
  const [imageError, setImageError] = useState(false)

  const currentNode = currentPath ? getNode(state.fs, currentPath) : undefined
  const folderPath = currentNode ? parentPath(currentNode.path) : 'C:\\My Pictures'
  // The React Compiler memoizes this automatically; a manual useMemo here trips
  // its preserve-memoization rule because state.fs is provider-owned.
  const folderImages = listDirectory(state.fs, folderPath).filter(isImageFile)
  const currentIndex = currentNode ? folderImages.findIndex((node) => node.path === currentNode.path) : -1
  const imageSrc = currentNode?.dataUrl ?? ''
  const fitBackground = imageSrc ? { backgroundImage: `url("${imageSrc.replace(/"/g, '\\"')}")` } : undefined

  useEffect(() => {
    setWindowTitle(windowId, currentNode ? `${baseName(currentNode.path)} - Imaging Preview` : 'Imaging Preview')
  }, [currentNode, setWindowTitle, windowId])

  function chooseOffset(offset: -1 | 1) {
    if (currentIndex < 0 || folderImages.length < 2) return
    const next = folderImages[(currentIndex + offset + folderImages.length) % folderImages.length]
    setCurrentPath(next.path)
    setImageError(false)
  }

  function editInPaint() {
    if (!currentNode) return
    openApp('paint', { filePath: currentNode.path })
  }

  function copyPath() {
    if (!currentNode) return
    void navigator.clipboard?.writeText(currentNode.path).catch(() => {
      showMessageBox({
        title: 'Imaging Preview',
        message: 'Clipboard is not available in this browser session.',
        icon: 'warning',
        buttons: ['ok'],
      })
    })
  }

  const canShowImage = Boolean(currentNode?.dataUrl && !imageError)

  return (
    <div className="app-content image-viewer-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Image</li>
        <li>Help</li>
      </ul>
      <div className="toolbar image-viewer-toolbar">
        <button type="button" onClick={() => chooseOffset(-1)} disabled={folderImages.length < 2}>
          Previous
        </button>
        <button type="button" onClick={() => chooseOffset(1)} disabled={folderImages.length < 2}>
          Next
        </button>
        <span className="toolbar-separator" aria-hidden="true" />
        <button type="button" className={fitToWindow ? 'pressed' : ''} onClick={() => setFitToWindow(true)}>
          Fit
        </button>
        <button type="button" className={!fitToWindow ? 'pressed' : ''} onClick={() => setFitToWindow(false)}>
          Actual
        </button>
        <span className="toolbar-separator" aria-hidden="true" />
        <button type="button" onClick={editInPaint} disabled={!currentNode}>
          Edit in Paint
        </button>
        <button type="button" onClick={copyPath} disabled={!currentNode}>
          Copy Path
        </button>
      </div>
      <div className={`sunken-panel image-viewer-stage ${fitToWindow ? 'is-fit' : 'is-actual'}`}>
        {canShowImage ? (
          fitToWindow ? (
            <>
              <div className="image-viewer-fit-image" role="img" aria-label={currentNode?.name} style={fitBackground} />
              <img className="image-viewer-preload" src={imageSrc} alt="" onError={() => setImageError(true)} />
            </>
          ) : (
            <img className="actual" src={imageSrc} alt={currentNode?.name} onError={() => setImageError(true)} />
          )
        ) : (
          <div className="image-viewer-empty">
            <img src={win98Icons.imageFile} alt="" />
            <p>{currentNode ? `Cannot preview ${currentNode.name}.` : 'Open a picture from My Pictures.'}</p>
            <span>{currentNode ? 'The file has no browser-readable image data.' : 'JPG, PNG, BMP, and GIF files open here.'}</span>
          </div>
        )}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{currentNode?.path ?? 'No file selected'}</p>
        <p className="status-bar-field">{currentNode?.fileType ?? 'Image Viewer'}</p>
        <p className="status-bar-field">
          {currentNode ? formatSize(currentNode.size) || '0 KB' : `${folderImages.length} picture(s)`}
        </p>
      </div>
    </div>
  )
}
