import './PdfViewerApp.css'
import { useEffect } from 'react'
import type { AppProps } from '../../types'
import { win98Icons } from '../../data/icons'
import { baseName, formatSize, getNode } from '../../os/filesystem'
import { useOs } from '../../os/useOs'

export function PdfViewerApp({ windowId, payload }: AppProps) {
  const { state, setWindowTitle } = useOs()
  const currentNode = payload?.filePath ? getNode(state.fs, payload.filePath) : undefined
  const pdfSrc = currentNode?.dataUrl ?? ''
  const title = currentNode ? `${baseName(currentNode.path)} - PDF Viewer` : 'PDF Viewer'

  useEffect(() => {
    setWindowTitle(windowId, title)
  }, [setWindowTitle, title, windowId])

  return (
    <div className="app-content pdf-viewer-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>View</li>
        <li>Document</li>
        <li>Help</li>
      </ul>
      <div className="toolbar pdf-viewer-toolbar">
        {pdfSrc ? (
          <>
            <a className="pdf-viewer-button" href={pdfSrc} target="_blank" rel="noreferrer">
              Open
            </a>
            <a className="pdf-viewer-button" href={pdfSrc} download={currentNode?.name}>
              Download
            </a>
          </>
        ) : (
          <button type="button" disabled>
            Open
          </button>
        )}
        <span className="toolbar-separator" aria-hidden="true" />
        <span className="pdf-viewer-path">{currentNode?.path ?? 'No PDF selected'}</span>
      </div>
      <div className="sunken-panel pdf-viewer-stage">
        {pdfSrc ? (
          <iframe className="pdf-viewer-frame" src={pdfSrc} title={currentNode?.name ?? 'PDF document'} />
        ) : (
          <div className="pdf-viewer-empty">
            <img src={win98Icons.textFile} alt="" />
            <p>No PDF selected.</p>
          </div>
        )}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{currentNode?.name ?? 'Document'}</p>
        <p className="status-bar-field">{currentNode?.fileType ?? 'PDF Document'}</p>
        <p className="status-bar-field">{currentNode ? formatSize(currentNode.size) || '0 KB' : 'Ready'}</p>
      </div>
    </div>
  )
}
