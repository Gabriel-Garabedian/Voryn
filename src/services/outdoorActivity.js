import { Capacitor, registerPlugin } from '@capacitor/core'

const OutdoorActivity = registerPlugin('OutdoorActivity')
export const OUTDOOR_SPORTS = { running: 'Corrida', walking: 'Caminhada', cycling: 'Ciclismo' }
export const outdoorActivity = {
  available: () => Capacitor.getPlatform() === 'android',
  read: userId => OutdoorActivity.read({ userId }),
  start: (userId, sport) => OutdoorActivity.start({ userId, sport }),
  pause: userId => OutdoorActivity.pause({ userId }),
  finish: userId => OutdoorActivity.finish({ userId }),
  detail: (userId, id) => OutdoorActivity.detail({ userId, id }),
  delete: (userId, id) => OutdoorActivity.delete({ userId, id }),
  deleteAll: userId => OutdoorActivity.deleteAll({ userId }),
  stop: () => OutdoorActivity.stop(),
}

export function formatActivityTime(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

export function activityRate(row) {
  if (!(row?.distanceMeters > 0) || !(row?.elapsedMs > 0)) return '—'
  if (row.sport === 'cycling') return (row.distanceMeters / row.elapsedMs * 3600).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  const secondsPerKm = Math.round(row.elapsedMs / row.distanceMeters)
  return `${Math.floor(secondsPerKm / 60)}:${String(secondsPerKm % 60).padStart(2, '0')}`
}

export function routeSegments(points) {
  const segments = []
  let previous
  for (const point of points) {
    if (point.segment !== previous || !segments.length) segments.push([])
    segments[segments.length - 1].push([point.lat, point.lon])
    previous = point.segment
  }
  return segments
}
