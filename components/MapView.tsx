'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vibe } from '@/lib/types';

// Fix Leaflet default icon paths broken by bundlers.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type NearbyUser = {
  user_id: string;
  first_name: string;
  age: number;
  city: string;
  energy_traits: string[];
  latitude: number;
  longitude: number;
  distance_km: number;
  vibe: Vibe | null;
  mood_text: string | null;
  mood_id: string | null;
  mood_created_at: string | null;
};

type WsMessage =
  | { type: 'location_update'; payload: { user_id: string; latitude: number; longitude: number; first_name: string; vibe: string | null; latest_mood: string | null } }
  | { type: 'user_online'; payload: NearbyUser }
  | { type: 'user_offline'; payload: { user_id: string } }
  | { type: 'connected'; payload: { user_id: string } }
  | { type: 'pong' };

type MapViewProps = {
  token: string;
  radiusKm?: number;
  onUserClick: (user: NearbyUser) => void;
};

const VIBE_EMOJI: Record<Vibe, string> = {
  flirty: '🔥',
  playful: '😄',
  calm: '😌',
  curious: '🤔',
  venting: '😤',
  bored: '😑',
  chaotic: '🌪️',
};

const VIBE_COLOR: Record<Vibe, string> = {
  flirty: '#ec4899',
  playful: '#eab308',
  calm: '#10b981',
  curious: '#06b6d4',
  venting: '#f97316',
  bored: '#64748b',
  chaotic: '#a855f7',
};

function makeUserIcon(vibe: Vibe | null, label: string): L.DivIcon {
  const emoji = vibe ? VIBE_EMOJI[vibe] : '👤';
  const color = vibe ? VIBE_COLOR[vibe] : '#6b7280';
  return L.divIcon({
    html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer" title="${label}">${emoji}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function makeSelfIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:20px;height:20px;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Component that re-centers map when user coords change.
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MapView({ token, radiusKm = 25, onUserClick }: MapViewProps) {
  const [selfPos, setSelfPos] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<Map<string, NearbyUser>>(new Map());
  const [wsConnected, setWsConnected] = useState(false);
  const [locationError, setLocationError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch initial nearby users via REST.
  const fetchNearby = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/nearby?radius_km=${radiusKm}`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) return;
      const data = await res.json() as { users: NearbyUser[] };
      setNearbyUsers(new Map(data.users.map((u) => [u.user_id, u])));
    } catch {
      // non-fatal
    }
  }, [token, radiusKm]);

  // Update server with current position.
  const pushLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await fetch('/api/location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ latitude: lat, longitude: lng, share_location: true }),
      });
    } catch {
      // non-fatal
    }
  }, [token]);

  // Connect WebSocket with exponential back-off.
  const connectWs = useCallback(() => {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${protocol}://${host}/api/ws?token=${encodeURIComponent(token)}&radius_km=${radiusKm}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      reconnectDelay.current = 1000;
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as WsMessage;
        if (msg.type === 'location_update') {
          const { user_id, latitude, longitude, first_name, vibe, latest_mood } = msg.payload;
          setNearbyUsers((prev) => {
            const next = new Map(prev);
            const existing = next.get(user_id);
            next.set(user_id, {
              ...(existing ?? {
                user_id,
                first_name,
                age: 0,
                city: '',
                energy_traits: [],
                distance_km: 0,
                mood_id: null,
                mood_created_at: null,
              }),
              user_id,
              first_name,
              latitude,
              longitude,
              vibe: (vibe as Vibe) ?? null,
              mood_text: latest_mood ?? null,
            });
            return next;
          });
        } else if (msg.type === 'user_offline') {
          setNearbyUsers((prev) => {
            const next = new Map(prev);
            next.delete(msg.payload.user_id);
            return next;
          });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      const delay = Math.min(reconnectDelay.current, 30_000);
      reconnectDelay.current = delay * 2;
      reconnectTimer.current = setTimeout(connectWs, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, radiusKm]);

  // Heartbeat – keep connection alive.
  useEffect(() => {
    if (!wsConnected) return;
    const id = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [wsConnected]);

  // Geolocation + initial data load.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelfPos({ lat, lng });
        await pushLocation(lat, lng);
        await fetchNearby();
        connectWs();
      },
      (err) => {
        setLocationError(`Location access denied: ${err.message}`);
        // Still connect WS – we just won't have a self marker.
        connectWs();
        void fetchNearby();
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );

    return () => {
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const users = Array.from(nearbyUsers.values());
  const center = selfPos ?? { lat: 37.7749, lng: -122.4194 };

  return (
    <div className="relative w-full h-screen">
      {locationError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/90 text-red-100 text-sm px-4 py-2 rounded-xl border border-red-700">
          {locationError}
        </div>
      )}

      {/* Status overlay */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${wsConnected ? 'bg-emerald-900/80 border-emerald-700 text-emerald-200' : 'bg-slate-900/80 border-slate-700 text-slate-400'}`}>
          <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {wsConnected ? 'Live' : 'Reconnecting…'}
        </div>
        <div className="bg-slate-900/80 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-full">
          {users.length} nearby
        </div>
      </div>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {selfPos && (
          <>
            <RecenterMap lat={selfPos.lat} lng={selfPos.lng} />
            <Marker position={[selfPos.lat, selfPos.lng]} icon={makeSelfIcon()}>
              <Popup>You are here</Popup>
            </Marker>
          </>
        )}

        {users.map((user) => (
          <Marker
            key={user.user_id}
            position={[user.latitude, user.longitude]}
            icon={makeUserIcon(user.vibe, user.first_name)}
            eventHandlers={{ click: () => onUserClick(user) }}
          >
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold">{user.first_name}{user.age ? `, ${user.age}` : ''}</p>
                {user.vibe && <p className="text-sm text-gray-600">{VIBE_EMOJI[user.vibe]} {user.vibe}</p>}
                {user.mood_text && <p className="text-xs italic text-gray-500 mt-1">&ldquo;{user.mood_text}&rdquo;</p>}
                <p className="text-xs text-gray-400 mt-1">{user.distance_km.toFixed(1)} km away</p>
                <button
                  className="mt-2 w-full text-xs bg-pink-600 text-white rounded px-2 py-1 hover:bg-pink-700"
                  onClick={() => onUserClick(user)}
                >
                  View Profile
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
