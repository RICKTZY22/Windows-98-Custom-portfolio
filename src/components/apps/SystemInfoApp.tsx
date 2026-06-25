import './SystemInfoApp.css'
import { useState, type ReactNode } from 'react'
import { win98Icons } from '../../data/icons'
import { machineProfile, formatMemoryMb, startupItems } from '../../data/systemProfile'
import { useOs } from '../../os/useOs'
import { driverStatusLabel } from '../../os/systemHealth'
import { bootSequenceLabel } from '../../data/bios'
import type { FsState, NetworkState, AudioState, DriverType } from '../../types'

type NodeId =
  | 'summary'
  | 'resources'
  | 'comp-display'
  | 'comp-audio'
  | 'comp-network'
  | 'comp-storage'
  | 'comp-input'
  | 'sw-drivers'
  | 'sw-startup'

const IRQ_TABLE: Array<[string, string]> = [
  ['00', 'System timer'],
  ['01', 'Standard 101/102-Key Keyboard'],
  ['02', 'Programmable interrupt controller'],
  ['03', 'Communications Port (COM2)'],
  ['04', 'Communications Port (COM1)'],
  ['05', 'Sound Blaster 16 or AWE-32'],
  ['06', 'Standard Floppy Disk Controller'],
  ['07', 'Printer Port (LPT1)'],
  ['12', 'PS/2 Compatible Mouse Port'],
  ['13', 'Numeric data processor'],
  ['14', 'Primary IDE controller (dual fifo)'],
]

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="sysinfo-row">
      <span className="sysinfo-key">{label}</span>
      <span className="sysinfo-val">{value}</span>
    </div>
  )
}

function driverValue(fs: FsState, type: DriverType) {
  const label = driverStatusLabel(fs, type)
  return <span className={label === 'Detected' ? 'sysinfo-ok' : 'sysinfo-bad'}>{label}</span>
}

function detailFor(
  node: NodeId,
  fs: FsState,
  network: NetworkState,
  audio: AudioState,
  bootSeq: string,
): { title: string; body: ReactNode } {
  switch (node) {
    case 'summary':
      return {
        title: 'System Summary',
        body: (
          <>
            <Row label="OS Name" value={machineProfile.osName} />
            <Row label="Version" value={machineProfile.osVersion} />
            <Row label="OEM ID" value={machineProfile.oemId} />
            <Row label="Registered Owner" value={machineProfile.registeredOwner} />
            <Row label="System Model" value={machineProfile.systemModel} />
            <Row label="System Type" value={machineProfile.systemType} />
            <Row label="Processor" value={machineProfile.processor} />
            <Row label="BIOS Version" value={machineProfile.biosVersion} />
            <Row label="BIOS Date" value={machineProfile.biosDate} />
            <Row label="Total Physical Memory" value={formatMemoryMb(machineProfile.totalMemoryKb)} />
            <Row label="Base Memory" value={`${machineProfile.baseMemoryKb} KB`} />
            <Row label="Extended Memory" value={`${machineProfile.extendedMemoryKb.toLocaleString('en-US')} KB`} />
            <Row label="Boot Sequence" value={bootSeq} />
            <Row label="Boot Device" value="Fixed disk (C:)" />
            <Row label="Locale" value="Philippines" />
            <Row label="Hardware Abstraction" value="Browser sandbox — no real hardware is accessed" />
          </>
        ),
      }
    case 'resources':
      return {
        title: 'Hardware Resources — IRQs',
        body: (
          <div className="sysinfo-irq">
            <div className="sysinfo-irq-head">
              <span>IRQ</span>
              <span>Device</span>
            </div>
            {IRQ_TABLE.map(([irq, device]) => (
              <div className="sysinfo-irq-row" key={irq}>
                <span>{irq}</span>
                <span>{device}</span>
              </div>
            ))}
          </div>
        ),
      }
    case 'comp-display':
      return {
        title: 'Components — Display',
        body: (
          <>
            <Row label="Name" value="S3 Trio64V+ PCI (732/733)" />
            <Row label="Adapter RAM" value="2 MB" />
            <Row label="Resolution" value="800 x 600 x 256 colors" />
            <Row label="Refresh Rate" value="60 Hz" />
            <Row label="Driver Status" value={driverValue(fs, 'video')} />
          </>
        ),
      }
    case 'comp-audio':
      return {
        title: 'Components — Multimedia / Audio',
        body: (
          <>
            <Row label="Name" value="Sound Blaster 16 or AWE-32" />
            <Row label="Manufacturer" value="Creative Technology Ltd." />
            <Row label="Resources" value="IRQ 5, I/O 0220, DMA 1" />
            <Row label="Audio Output" value={audio.enabled ? (audio.muted ? 'Enabled (muted)' : 'Enabled') : 'Not started'} />
            <Row label="Volume" value={`${Math.round(audio.volume * 100)}%`} />
            <Row label="Driver Status" value={driverValue(fs, 'audio')} />
          </>
        ),
      }
    case 'comp-network':
      return {
        title: 'Components — Network',
        body: (
          <>
            <Row label="Adapter" value={network.adapterName} />
            <Row label="MAC Address" value={network.macAddress} />
            <Row label="IP Address" value={network.connected ? network.ipAddress : 'Not assigned (media disconnected)'} />
            <Row label="Subnet Mask" value={network.connected ? network.subnetMask : '—'} />
            <Row label="Gateway" value={network.connected ? network.gateway : '—'} />
            <Row label="DHCP" value={network.dhcp ? 'Enabled' : 'Disabled'} />
            <Row label="Status" value={network.connected ? 'Connected' : 'Disconnected'} />
            <Row label="Driver Status" value={driverValue(fs, 'network')} />
          </>
        ),
      }
    case 'comp-storage':
      return {
        title: 'Components — Storage',
        body: (
          <>
            <Row label="Fixed Disk" value={`${machineProfile.diskModel} (${machineProfile.diskSize})`} />
            <Row label="CD-ROM" value={machineProfile.cdrom} />
            <Row label="Floppy" value={`Drive A: ${machineProfile.floppy}`} />
            <Row label="File System" value="FAT32" />
            <Row label="Driver Status" value={driverValue(fs, 'storage')} />
          </>
        ),
      }
    case 'comp-input':
      return {
        title: 'Components — Input',
        body: (
          <>
            <Row label="Keyboard" value="Standard 101/102-Key or Microsoft Natural Keyboard" />
            <Row label="Mouse" value="PS/2 Compatible Mouse Port" />
            <Row label="Driver Status" value={driverValue(fs, 'input')} />
          </>
        ),
      }
    case 'sw-drivers':
      return {
        title: 'Software Environment — System Drivers',
        body: (
          <>
            <Row label="Video (display.drv)" value={driverValue(fs, 'video')} />
            <Row label="Audio (sound.drv)" value={driverValue(fs, 'audio')} />
            <Row label="Network (ndis.vxd)" value={driverValue(fs, 'network')} />
            <Row label="Input (keyboard/mouse.drv)" value={driverValue(fs, 'input')} />
            <Row label="Storage (IDE controller)" value={driverValue(fs, 'storage')} />
          </>
        ),
      }
    case 'sw-startup':
      return {
        title: 'Software Environment — Startup Programs',
        body: (
          <div className="sysinfo-startup">
            {startupItems.map((item) => (
              <div className="sysinfo-startup-row" key={item.name}>
                <span className="sysinfo-startup-name">{item.name}</span>
                <span className="sysinfo-startup-cmd">{item.command}</span>
                <span className="sysinfo-startup-loc">{item.location}</span>
              </div>
            ))}
          </div>
        ),
      }
  }
}

export function SystemInfoApp() {
  const { state } = useOs()
  const [selected, setSelected] = useState<NodeId>('summary')
  const bootSeq = bootSequenceLabel(state.bios)
  const detail = detailFor(selected, state.fs, state.network, state.audio, bootSeq)

  const leaf = (id: NodeId, label: string) => (
    <li>
      <button
        type="button"
        className={`sysinfo-node ${selected === id ? 'selected' : ''}`}
        onClick={() => setSelected(id)}
      >
        {label}
      </button>
    </li>
  )

  return (
    <div className="app-content sysinfo-app">
      <ul className="os-menu-bar" role="menubar">
        <li>File</li>
        <li>Edit</li>
        <li>View</li>
        <li>Tools</li>
        <li>Help</li>
      </ul>

      <div className="sysinfo-body">
        <div className="sunken-panel sysinfo-tree-shell">
          <ul className="tree-view sysinfo-tree">
            {leaf('summary', 'System Summary')}
            {leaf('resources', 'Hardware Resources')}
            <li>
              <details open>
                <summary className="sysinfo-group">Components</summary>
                <ul>
                  {leaf('comp-display', 'Display')}
                  {leaf('comp-audio', 'Multimedia')}
                  {leaf('comp-network', 'Network')}
                  {leaf('comp-storage', 'Storage')}
                  {leaf('comp-input', 'Input')}
                </ul>
              </details>
            </li>
            <li>
              <details open>
                <summary className="sysinfo-group">Software Environment</summary>
                <ul>
                  {leaf('sw-drivers', 'System Drivers')}
                  {leaf('sw-startup', 'Startup Programs')}
                </ul>
              </details>
            </li>
          </ul>
        </div>

        <div className="sysinfo-detail">
          <div className="sysinfo-detail-head">
            <img src={win98Icons.computer} alt="" />
            <span>{detail.title}</span>
          </div>
          <div className="sunken-panel sysinfo-detail-body">{detail.body}</div>
        </div>
      </div>

      <div className="status-bar sysinfo-status">
        <p className="status-bar-field">Microsoft System Information</p>
        <p className="status-bar-field">{machineProfile.osName}</p>
      </div>
    </div>
  )
}
