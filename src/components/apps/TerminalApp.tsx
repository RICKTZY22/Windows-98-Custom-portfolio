import { useMemo, useRef, useState } from 'react'
import {
  getFileContent,
  getNode,
  getParentPath,
  isPathWithin,
  listDirectory,
  normalizePath,
  resolvePath,
} from '../../data/filesystem'
import type { AppId, NetworkStatus, WindowPayload } from '../../types'

type TerminalAppProps = {
  path?: string
  network: NetworkStatus
  setNetwork: (updater: (current: NetworkStatus) => NetworkStatus) => void
  openApp: (appId: AppId, payload?: WindowPayload) => void
  deletedPaths: Set<string>
}

const banner = ['Microsoft(R) Windows 98', '(C)Copyright Microsoft Corp 1981-1998.', '']

function isDeletedPath(path: string, deletedPaths: Set<string>) {
  return [...deletedPaths].some((deletedPath) => isPathWithin(path, deletedPath))
}

export function TerminalApp({ path = 'C:\\', network, setNetwork, openApp, deletedPaths }: TerminalAppProps) {
  const [currentPath, setCurrentPath] = useState(() => normalizePath(path))
  const [lines, setLines] = useState<string[]>(banner)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const prompt = useMemo(() => `${currentPath}>`, [currentPath])

  function print(output: string[]) {
    setLines((current) => [...current, `${prompt}${input}`, ...output])
  }

  function runCommand(command: string) {
    const trimmed = command.trim()
    const [rawCommand = '', ...args] = trimmed.split(/\s+/)
    const verb = rawCommand.toLowerCase()

    if (!trimmed) {
      print([''])
      return
    }

    if (verb === 'cls') {
      setLines([])
      return
    }

    if (verb === 'help') {
      print(['Supported commands:', 'DIR, CD, CLS, TYPE, VER, IPCONFIG, PING, START, HELP'])
      return
    }

    if (verb === 'ver') {
      print(['Windows 98 Portfolio Edition [Version 4.10.1998]'])
      return
    }

    if (verb === 'dir') {
      const targetPath = args.length ? resolvePath(currentPath, args.join(' ')) : currentPath
      const node = getNode(targetPath)
      if (!node || node.kind !== 'folder' || isDeletedPath(targetPath, deletedPaths)) {
        print(['File Not Found'])
        return
      }
      const items = listDirectory(targetPath).filter((item) => !isDeletedPath(item.path, deletedPaths))
      print([
        ` Directory of ${targetPath}`,
        '',
        ...items.map((item) =>
          `${item.kind === 'folder' ? '<DIR>' : '     '} ${item.modified.padEnd(20, ' ')} ${String(item.size ?? '').padStart(8, ' ')} ${item.name}`,
        ),
        '',
        `${items.length} file(s)`,
      ])
      return
    }

    if (verb === 'cd') {
      const targetPath = args.length ? resolvePath(currentPath, args.join(' ')) : 'C:\\'
      const node = getNode(targetPath)
      if (node?.kind === 'folder' && !isDeletedPath(targetPath, deletedPaths)) {
        print([''])
        setCurrentPath(targetPath)
      } else {
        print(['Invalid directory'])
      }
      return
    }

    if (verb === 'type') {
      const targetPath = resolvePath(currentPath, args.join(' '))
      const node = getNode(targetPath)
      if (!node || node.kind === 'folder' || isDeletedPath(targetPath, deletedPaths)) {
        print(['File Not Found'])
      } else {
        print(getFileContent(targetPath).split('\n'))
      }
      return
    }

    if (verb === 'ipconfig') {
      print([
        'Windows 98 IP Configuration',
        '',
        `Ethernet adapter ${network.adapterName}:`,
        `   Connection status . . . . . . . : ${network.connected ? 'Connected' : 'Media disconnected'}`,
        `   IP Address. . . . . . . . . . . : ${network.connected ? network.ipAddress : '0.0.0.0'}`,
        `   Subnet Mask . . . . . . . . . . : ${network.subnetMask}`,
        `   Default Gateway . . . . . . . . : ${network.gateway}`,
      ])
      return
    }

    if (verb === 'ping') {
      const host = args[0] || 'portfolio.local'
      if (!network.connected) {
        print([`Pinging ${host} with 32 bytes of data:`, 'Request timed out.', 'Request timed out.'])
        return
      }
      setNetwork((current) => ({
        ...current,
        packetsSent: current.packetsSent + 4,
        packetsReceived: current.packetsReceived + 4,
        lastPing: host,
      }))
      print([
        `Pinging ${host} [192.168.98.80] with 32 bytes of data:`,
        'Reply from 192.168.98.80: bytes=32 time<10ms TTL=128',
        'Reply from 192.168.98.80: bytes=32 time<10ms TTL=128',
        '',
        'Ping statistics: Sent = 2, Received = 2, Lost = 0 (0% loss)',
      ])
      return
    }

    if (verb === 'start') {
      const target = args.join(' ').toLowerCase()
      const known: Record<string, AppId> = {
        paint: 'paint',
        mspaint: 'paint',
        calc: 'calculator',
        calculator: 'calculator',
        notepad: 'notepad',
        sndrec32: 'soundRecorder',
        iexplore: 'internetExplorer',
        control: 'controlPanel',
        cmd: 'terminal',
        command: 'terminal',
        resume: 'resume',
        network: 'network',
        explorer: 'computer',
        themes: 'themes',
      }
      if (known[target]) {
        openApp(known[target], { path: currentPath })
        print([''])
        return
      }
      const targetPath = resolvePath(currentPath, args.join(' '))
      const node = isDeletedPath(targetPath, deletedPaths) ? undefined : getNode(targetPath)
      if (node?.appId) {
        openApp(
          node.appId,
          node.fileType === 'Application' ? { path: getParentPath(node.path) } : { filePath: node.path, path: currentPath },
        )
        print([''])
        return
      }
      print(['Bad command or file name'])
      return
    }

    print(['Bad command or file name'])
  }

  return (
    <div className="terminal-app" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-output">
        {lines.map((line, index) => (
          <div key={`${line}-${index}`}>{line || '\u00a0'}</div>
        ))}
        <form
          className="terminal-input-line"
          onSubmit={(event) => {
            event.preventDefault()
            runCommand(input)
            setInput('')
          }}
        >
          <span>{prompt}</span>
          <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} autoFocus />
        </form>
      </div>
    </div>
  )
}
