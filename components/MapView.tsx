'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vibe } from '@/lib/types';

// Fix Leaflet default icon paths broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const VIBE_EMOJIS: Record<Vibe, string> = {
  flirty: '🔥',
  playful: '😄',
  calm: '😌',
  curious: '🤔',
  venting: '😤',
  bored: '😑',
  chaotic: '🌪️',
};

function makeEmojiIcon(emoji: string) {
  return L.divIcon({
    html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

const selfIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 3px rgba(59,130,246,.4)"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export type NearbyUser = {
  id: string;
  first_name: string;
  age: number;
  city: string;
  energy_traits: string[];
  latitude: number;
  longitude: number;
  distance_km: number;
  mood_id?: string;
  mood_text?: string;
  vibe?: Vibe;
};

type MapViewProps = {
  onUserClick: (user: NearbyUser) => void;
};

type WsStatus = 'connected' | 'disconnected' | 'reconnecting';

const WS_MAX_DELAY_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MapView({ onUserClick }: MapViewProps) {
  const [selfCoords, setSelfCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<Map<string, NearbyUser>>(new Map());
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  }

  const updateNearbyUser = useCallback((patch: Partial<NearbyUser> & { id: string }) => {
    setNearbyUsers((prev) => {
      const next = new Map(prev);
      const existing = next.get(patch.id);
      if (existing) {
        next.set(patch.id, { ...existing, ...patch });
      } else if (
        patch.first_name !== undefined &&
        patch.latitude !== undefined &&
        patch.longitude !== undefined
      ) {
        next.set(patch.id, patch as NearbyUser);
      }
      return next;
    });
  }, []);

  const removeNearbyUser = useCallback((id: string) => {
    setNearbyUsers((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────

  const connectWs = useCallback(
    (lat: number, lng: number) => {
      if (!isMounted.current) return;
      const token = getToken();
      if (!token) return;

      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${proto}://${window.location.host}/api/ws?token=${encodeURIComponent(token)}&lat=${lat}&lng=${lng}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) return;
        setWsStatus('connected');
        reconnectDelay.current = 1000;

        // Start heartbeat
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          switch (msg.type) {
            case 'location_update':
              updateNearbyUser({
                id: msg.user_id,
                first_name: msg.first_name,
                latitude: msg.latitude,
                longitude: msg.longitude,
                distance_km: msg.distance_km ?? 0,
                vibe: msg.vibe,
                mood_text: msg.latest_mood,
                age: msg.age ?? 0,
                city: msg.city ?? '',
                energy_traits: msg.energy_traits ?? [],
              });
              break;
            case 'user_online':
              updateNearbyUser({
                id: msg.user_id,
                first_name: msg.first_name,
                latitude: msg.latitude,
                longitude: msg.longitude,
                distance_km: msg.distance_km ?? 0,
                vibe: msg.vibe,
                mood_text: msg.latest_mood,
                age: msg.age ?? 0,
                city: msg.city ?? '',
                energy_traits: msg.energy_traits ?? [],
              });
              break;
            case 'user_offline':
              removeNearbyUser(msg.user_id);
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!isMounted.current) return;
        setWsStatus('reconnecting');
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * 2, WS_MAX_DELAY_MS);
        reconnectTimer.current = setTimeout(() => {
          if (isMounted.current) connectWs(lat, lng);
        }, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    },
    [updateNearbyUser, removeNearbyUser]
  );

  // ── Geolocation + initial data load ─────────────────────────────────────

  useEffect(() => {
    isMounted.current = true;

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!isMounted.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        setSelfCoords({ lat, lng });

        const token = getToken();
        if (!token) return;

        // 1. Update server with current location
        try {
          await fetch('/api/users/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ latitude: lat, longitude: lng, share_location: true }),
          });
        } catch {
          // Non-fatal — continue loading map
        }

        // 2. Fetch initial nearby users
        try {
          const res = await fetch('/api/users/nearby', {
            headers: { Authorization: 'Bearer ' + token },
          });
          if (res.ok) {
            const data = await res.json();
            const usersMap = new Map<string, NearbyUser>(
              (data.users as NearbyUser[]).map((u) => [u.id, u])
            );
            setNearbyUsers(usersMap);
          }
        } catch {
          // Non-fatal
        }

        // 3. Connect WebSocket
        connectWs(lat, lng);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location permission denied. Enable location access to see nearby users.',
          2: 'Location unavailable. Try refreshing.',
          3: 'Location request timed out. Try refreshing.',
        };
        setGeoError(messages[err.code] ?? 'Unable to determine your location.');
      },
      { maximumAge: 60_000, timeout: 10_000 }
    );

    return () => {
      isMounted.current = false;
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // ── Render ────────────────────────────────────────────────────────────────

  const statusColor: Record<WsStatus, string> = {
    connected: 'bg-green-500',
    disconnected: 'bg-gray-500',
    reconnecting: 'bg-yellow-500',
  };

  const statusLabel: Record<WsStatus, string> = {
    connected: 'Live',
    disconnected: 'Offline',
    reconnecting: 'Reconnecting…',
  };

  if (geoError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-vibe-950 px-6">
        <div className="card max-w-sm text-center">
          <div className="text-4xl mb-4">📍</div>
          <h2 className="text-xl font-bold mb-2">Location needed</h2>
          <p className="text-vibe-300 text-sm">{geoError}</p>
        </div>
      </div>
    );
  }

  if (!selfCoords) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-vibe-950">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📍</div>
          <p className="text-vibe-300">Finding your location…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen">
      <MapContainer
        center={[selfCoords.lat, selfCoords.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap lat={selfCoords.lat} lng={selfCoords.lng} />

        {/* Self marker */}
        <Marker position={[selfCoords.lat, selfCoords.lng]} icon={selfIcon}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Nearby user markers */}
        {Array.from(nearbyUsers.values()).map((user) => {
          const emoji = user.vibe ? VIBE_EMOJIS[user.vibe] ?? '📍' : '📍';
          return (
            <Marker
              key={user.id}
              position={[user.latitude, user.longitude]}
              icon={makeEmojiIcon(emoji)}
              eventHandlers={{ click: () => onUserClick(user) }}
            >
              <Popup>
                <div className="min-w-[140px]">
                  <p className="font-bold">
                    {user.first_name}, {user.age}
                  </p>
                  {user.vibe && (
                    <p className="text-sm text-gray-600">
                      {emoji} {user.vibe}
                    </p>
                  )}
                  {user.mood_text && (
                    <p className="text-sm italic mt-1 text-gray-700">&ldquo;{user.mood_text}&rdquo;</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{user.distance_km} km away</p>
                  <button
                    onClick={() => onUserClick(user)}
                    className="mt-2 text-xs text-blue-600 underline"
                  >
                    View Profile
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="bg-vibe-900/90 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-2 shadow">
          <span className={`h-2 w-2 rounded-full ${statusColor[wsStatus]}`} />
          <span className="text-xs text-vibe-100 font-medium">{statusLabel[wsStatus]}</span>
        </div>
        <div className="bg-vibe-900/90 backdrop-blur rounded-xl px-3 py-2 shadow">
          <span className="text-xs text-vibe-100 font-medium">
            {nearbyUsers.size} nearby {nearbyUsers.size === 1 ? 'user' : 'users'}
          </span>
        </div>
      </div>
    </div>
  );
}
