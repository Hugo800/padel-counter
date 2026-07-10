import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import type { DeviceInfo } from '../types/room';

interface DeviceMapProps {
  devices: DeviceInfo[];
}

/** A group of devices that resolved to the same coordinates. */
interface Cluster {
  key: string;
  lat: number;
  lon: number;
  label: string;
  devices: DeviceInfo[];
}

/**
 * A CSS-only Leaflet marker (a coloured pin), used instead of the default PNG
 * marker so we don't depend on image asset paths that break under bundlers.
 */
const pinIcon = L.divIcon({
  className: '',
  html: `<span style="
    display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;
    background:#16a34a;transform:rotate(-45deg);
    border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
  popupAnchor: [0, -18],
});

/** Fits the map viewport to show every marker whenever they change. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }
    map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
  }, [map, points]);
  return null;
}

/**
 * Shows the located devices of a room on an interactive map. Devices that
 * resolve to the same coordinates (common when everyone shares one public IP
 * on a court's WiFi) are clustered into a single pin.
 */
export function DeviceMap({ devices }: DeviceMapProps) {
  const clusters = useMemo<Cluster[]>(() => {
    const byLocation = new Map<string, Cluster>();
    for (const device of devices) {
      if (!device.location) continue;
      const { lat, lon, city, country } = device.location;
      const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
      const existing = byLocation.get(key);
      if (existing) {
        existing.devices.push(device);
      } else {
        byLocation.set(key, {
          key,
          lat,
          lon,
          label: [city, country].filter(Boolean).join(', ') || 'Unknown area',
          devices: [device],
        });
      }
    }
    return [...byLocation.values()];
  }, [devices]);

  const points = useMemo<[number, number][]>(
    () => clusters.map((c) => [c.lat, c.lon]),
    [clusters],
  );

  if (clusters.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400 dark:bg-slate-800">
        No devices could be located (private network or lookup unavailable).
      </div>
    );
  }

  return (
    <div className="h-64 overflow-hidden rounded-2xl">
      <MapContainer
        center={[points[0][0], points[0][1]]}
        zoom={4}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {clusters.map((cluster) => (
          <Marker key={cluster.key} position={[cluster.lat, cluster.lon]} icon={pinIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{cluster.label}</p>
                <ul className="mt-1 space-y-0.5">
                  {cluster.devices.map((d) => (
                    <li key={d.id} className="text-slate-600">
                      {d.device} · <span className="font-mono">{d.ip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
