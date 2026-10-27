import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { routeSegments } from '@/services/outdoorActivity'

export default function OutdoorRouteMap({ points }) {
  const container = useRef(null)
  const map = useRef(null)
  const route = useRef(null)
  const markers = useRef(null)
  const [tileError, setTileError] = useState(false)
  useEffect(() => {
    const instance = L.map(container.current, { scrollWheelZoom: false }).setView([-15.78, -47.93], 4)
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance)
    tiles.on('tileerror', () => setTileError(true))
    const reload = () => { setTileError(false); tiles.redraw() }
    window.addEventListener('online', reload)
    map.current = instance
    route.current = L.polyline([], { color: '#9672ff', weight: 5 }).addTo(instance)
    markers.current = L.layerGroup().addTo(instance)
    const resize = new ResizeObserver(() => instance.invalidateSize())
    resize.observe(container.current)
    return () => { resize.disconnect(); window.removeEventListener('online', reload); instance.remove(); map.current = null }
  }, [])
  useEffect(() => {
    if (!map.current) return
    route.current.setLatLngs(routeSegments(points))
    markers.current.clearLayers()
    if (!points.length) return
    const first = points[0]
    const last = points[points.length - 1]
    L.circleMarker([first.lat, first.lon], { radius: 6, color: '#fff', fillColor: '#27865b', fillOpacity: 1 }).bindTooltip('Início').addTo(markers.current)
    L.circleMarker([last.lat, last.lon], { radius: 6, color: '#fff', fillColor: '#9672ff', fillOpacity: 1 }).bindTooltip('Última posição registrada').addTo(markers.current)
    map.current.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lon])), { padding: [28, 28], maxZoom: 17, animate: false })
  }, [points])
  return <div className="outdoor-map-wrap">
    <div ref={container} className="outdoor-map" role="region" aria-label={`Mapa do trajeto, ${points.length} posições registradas`} />
    {!points.length && <p className="outdoor-map-note">O trajeto aparecerá quando o GPS localizar você.</p>}
    {tileError && <p className="outdoor-map-note" role="status">Mapa base indisponível. A gravação GPS continua sem internet.</p>}
  </div>
}
