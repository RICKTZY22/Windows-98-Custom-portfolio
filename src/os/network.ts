import type { NetworkState } from '../types'
import { nowStamp } from './filesystem'

/** Hostname -> IPv4 map for the simulated LAN/WAN. */
export const KNOWN_HOSTS: Record<string, string> = {
  'portfolio.local': '192.168.98.10',
  localhost: '127.0.0.1',
  'google.com': '142.250.80.46',
  'youtube.com': '142.250.80.78',
  'github.com': '140.82.112.3',
}

const ADAPTER_NAME = 'PCI Fast Ethernet DEC 21140'
const MAC_ADDRESS = '44-45-53-54-00-62'
const GATEWAY = '192.168.98.1'
const DNS = '192.168.98.1'
const SUBNET = '255.255.255.0'

export const defaultNetworkState: NetworkState = {
  connected: true,
  dhcp: true,
  adapterName: ADAPTER_NAME,
  macAddress: MAC_ADDRESS,
  ipAddress: '192.168.98.23',
  subnetMask: SUBNET,
  gateway: GATEWAY,
  dns: DNS,
  packetsSent: 128,
  packetsReceived: 256,
  connectedSince: '06/12/2026 12:00 AM',
}

/** A fresh, connected DHCP lease on the 192.168.98.x subnet. */
export function randomDhcpLease(): NetworkState {
  const lastOctet = 20 + Math.floor(Math.random() * 230)
  return {
    connected: true,
    dhcp: true,
    adapterName: ADAPTER_NAME,
    macAddress: MAC_ADDRESS,
    ipAddress: `192.168.98.${lastOctet}`,
    subnetMask: SUBNET,
    gateway: GATEWAY,
    dns: DNS,
    packetsSent: 0,
    packetsReceived: 0,
    connectedSince: nowStamp(),
  }
}

/** The adapter after `ipconfig /release` (or unplugging the cable). */
export function releasedNetworkState(): NetworkState {
  return {
    connected: false,
    dhcp: true,
    adapterName: ADAPTER_NAME,
    macAddress: MAC_ADDRESS,
    ipAddress: '0.0.0.0',
    subnetMask: '0.0.0.0',
    gateway: '',
    dns: '',
    packetsSent: 0,
    packetsReceived: 0,
    connectedSince: undefined,
  }
}

const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

/** Strips protocol/path/port from a host or URL and lowercases it. */
function hostOf(hostOrUrl: string): string {
  let host = hostOrUrl.trim().toLowerCase()
  host = host.replace(/^[a-z]+:\/\//, '')
  host = host.replace(/^www\./, '')
  const slash = host.indexOf('/')
  if (slash >= 0) host = host.slice(0, slash)
  const colon = host.indexOf(':')
  if (colon >= 0) host = host.slice(0, colon)
  return host
}

/** Resolves a host to a simulated IP, or null when unknown. */
export function resolveHostIp(hostOrUrl: string, network: NetworkState): string | null {
  const host = hostOf(hostOrUrl)
  if (!host) return null
  if (IP_RE.test(host)) return host
  if (host === 'localhost') return '127.0.0.1'
  if (KNOWN_HOSTS[host]) return KNOWN_HOSTS[host]
  if (network.gateway && host === network.gateway) return network.gateway
  if (network.dns && host === network.dns) return network.dns
  return null
}

/** True when the host resolves and the simulated link can carry packets to it. */
export function resolveHostReachable(hostOrUrl: string, network: NetworkState): boolean {
  const ip = resolveHostIp(hostOrUrl, network)
  if (!ip) return false
  if (ip === '127.0.0.1' || ip === network.ipAddress) {
    return true // loopback always answers
  }
  return network.connected
}

export type PingReport = {
  /** Groups of lines to stream: 4 reply lines, then a blank line + statistics. */
  lines: string[][]
  success: boolean
}

export function pingReport(host: string, network: NetworkState): PingReport {
  const ip = resolveHostIp(host, network)
  if (!ip) {
    return { lines: [[`Unknown host ${hostOf(host) || host.trim()}.`]], success: false }
  }
  const reachable = resolveHostReachable(host, network)
  if (!reachable) {
    return {
      lines: [
        ['Request timed out.'],
        ['Request timed out.'],
        ['Request timed out.'],
        ['Request timed out.'],
        [
          '',
          `Ping statistics for ${ip}:`,
          '    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),',
        ],
      ],
      success: false,
    }
  }
  const local = ip === '127.0.0.1' || ip === network.ipAddress || ip === network.gateway
  const times: number[] = []
  const replies = [0, 1, 2, 3].map(() => {
    const time = local ? 1 + Math.floor(Math.random() * 2) : 12 + Math.floor(Math.random() * 30)
    times.push(time)
    const shown = time <= 1 ? 'time<1ms' : `time=${time}ms`
    return [`Reply from ${ip}: bytes=32 ${shown} TTL=${local ? 128 : 53}`]
  })
  const min = Math.min(...times)
  const max = Math.max(...times)
  const avg = Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
  return {
    lines: [
      ...replies,
      [
        '',
        `Ping statistics for ${ip}:`,
        '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),',
        'Approximate round trip times in milli-seconds:',
        `    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`,
      ],
    ],
    success: true,
  }
}
