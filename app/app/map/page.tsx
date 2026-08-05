'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiCall } from '@/lib/api';
import { calculateDistance, parseCoordinates } from '@/lib/geospatial';
import {
  DEFAULT_NEARBY_DISTANCE_MILES,
  NearbyDistanceMiles,
  milesToKilometers,
  normalizeNearbyDistanceMiles,
} from '@/lib/nearby';
import NearbyDistanceSelector from '@/components/NearbyDistanceSelector';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// ── types ──────────────────────────────────────────────────────────────────────

interface NearbyUser {
  id: string;
  first_name: string;
  age: number;
  city: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  mood_id: string | null;
  mood_text: string | null;
  mood_vibe: string | null;
}

interface NearbyResponse {
  users: NearbyUser[];
  radiusMiles: number;
}

interface MyLocation {
  latitude: number;
  longitude: number;
}

// ── vibe colours ───────────────────────────────────────────────────────────────

const VIBE_CLASSES: Record<string, string> = {
  flirty: 'bg-pink-500 text-white border-pink-300',
  bored: 'bg-slate-500 text-white border-slate-300',
  curious: 'bg-cyan-500 text-white border-cyan-300',
  venting: 'bg-orange-500 text-white border-orange-300',
  playful: 'bg-yellow-400 text-vibe-950 border-yellow-200',
  calm: 'bg-emerald-500 text-white border-emerald-300',
  chaotic: 'bg-purple-500 text-white border-purple-300',
};

const DEFAULT_MARKER = 'bg-vibe-600 text-white border-vibe-400';

const MAX_MAP_OFFSET_PCT = 42;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

// ── component ──────────────────────────────────────────────────────────────────

export default function MapPage() {
  const [myLocation, setMyLocation] = useState<MyLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState<NearbyDistanceMiles>(
    DEFAULT_NEARBY_DISTANCE_MILES
  );
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── geolocation ──────────────────────────────────────────────────────────────

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyLocation({ latitude, longitude });
        setLocationError(null);
      },
      (err) => {
        setLocationError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ── location sharing ──────────────────────────────────────────────────────────

  const pushLocation = useCallback(
    async (loc: MyLocation, share: boolean) => {
      try {
        await apiCall('/api/location', 'PUT', {
          latitude: loc.latitude,
          longitude: loc.longitude,
          share_location: share,
        });
      } catch {
        // best-effort; ignore throttle errors (429)
      }
    },
    []
  );

  const toggleSharing = useCallback(async () => {
    const next = !sharing;
    setSharing(next);

    if (next) {
      startWatching();
      if (myLocation) {
        await pushLocation(myLocation, true);
      }
    } else {
      stopWatching();
      await pushLocation(
        myLocation ?? { latitude: 0, longitude: 0 },
        false
      );
    }
  }, [sharing, myLocation, startWatching, stopWatching, pushLocation]);

  // ── fetch nearby ──────────────────────────────────────────────────────────────

  const fetchNearby = useCallback(async () => {
    if (!myLocation) return;
    setLoading(true);
    try {
      const data = await apiCall<NearbyResponse>(
        `/api/users/nearby?radius=${radiusMiles}`
      );
      setNearbyUsers(data.users ?? []);
      setLastRefreshed(new Date());
    } catch {
      // swallow; keep stale list
    } finally {
      setLoading(false);
    }
  }, [myLocation, radiusMiles]);

  // Refresh every 15 s while sharing
  useEffect(() => {
    if (sharing && myLocation) {
      fetchNearby();
      refreshTimerRef.current = setInterval(fetchNearby, 15_000);
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [sharing, myLocation, fetchNearby]);

  // Push updated location whenever it changes while sharing
  useEffect(() => {
    if (sharing && myLocation) {
      pushLocation(myLocation, true);
    }
  }, [sharing, myLocation, pushLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [stopWatching]);

  // ── render ────────────────────────────────────────────────────────────────────

  const radiusKm = milesToKilometers(radiusMiles);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-vibe-100">Live Map</h1>
          <p className="text-vibe-400 mt-1">
            See who&apos;s nearby in real time.
          </p>
        </div>

        <button
          onClick={toggleSharing}
          className={`btn ${sharing ? 'btn-secondary' : 'btn-primary'} min-w-[11rem]`}
        >
          {sharing ? '📍 Stop sharing' : '📡 Share my location'}
        </button>
      </div>

      {/* Location error */}
      {locationError && (
        <div className="rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          ⚠️ {locationError}
        </div>
      )}

      {/* Not sharing notice */}
      {!sharing && (
        <div className="rounded-lg border border-vibe-700 bg-vibe-900/50 px-4 py-5 text-center text-vibe-400">
          <p className="text-lg mb-1">📡 Location sharing is off</p>
          <p className="text-sm">
            Enable location sharing above to see and be seen on the map.
          </p>
        </div>
      )}

      {sharing && (
        <>
          {/* Radius selector */}
          <div className="card">
            <p className="text-sm text-vibe-400 mb-3">Search radius</p>
            <NearbyDistanceSelector
              value={radiusMiles}
              onChange={(v) => {
                setRadiusMiles(normalizeNearbyDistanceMiles(v) as NearbyDistanceMiles);
                setSelectedUser(null);
              }}
              disabled={loading}
            />
          </div>

          {/* Map */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-vibe-100">
                  Nearby people
                </h2>
                <p className="text-sm text-vibe-400">
                  Within {radiusMiles} miles
                  {lastRefreshed && (
                    <span className="ml-2 text-vibe-600">
                      · updated {lastRefreshed.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {loading && <LoadingSpinner />}
                <span className="badge">{nearbyUsers.length} nearby</span>
              </div>
            </div>

            {/* Radar map */}
            <div className="relative h-80 overflow-hidden rounded-2xl border border-vibe-700 bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.22),_rgba(15,23,42,0.9)_35%,_rgba(2,6,23,1)_100%)]">
              {/* Concentric rings */}
              <div className="absolute inset-6 rounded-full border border-vibe-700/60" />
              <div className="absolute inset-14 rounded-full border border-vibe-700/50" />
              <div className="absolute inset-24 rounded-full border border-vibe-700/40" />
              {/* Crosshairs */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-vibe-700/40" />
              <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-vibe-700/40" />

              {/* My position */}
              <div className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-vibe-950 bg-vibe-300 text-xs font-bold text-vibe-950 shadow-lg shadow-vibe-950/50">
                You
              </div>

              {/* Other users */}
              {nearbyUsers.map((user) => {
                if (!myLocation) return null;
                const coords = parseCoordinates(user.latitude, user.longitude);
                if (!coords) return null;

                // Relative displacement in km
                const dx =
                  calculateDistance(
                    myLocation.latitude,
                    myLocation.longitude,
                    myLocation.latitude,
                    user.longitude
                  ) * (user.longitude >= myLocation.longitude ? 1 : -1);
                const dy =
                  calculateDistance(
                    myLocation.latitude,
                    myLocation.longitude,
                    user.latitude,
                    myLocation.longitude
                  ) * (user.latitude >= myLocation.latitude ? 1 : -1);

                const left =
                  50 +
                  clamp(
                    (dx / radiusKm) * MAX_MAP_OFFSET_PCT,
                    -MAX_MAP_OFFSET_PCT,
                    MAX_MAP_OFFSET_PCT
                  );
                const top =
                  50 -
                  clamp(
                    (dy / radiusKm) * MAX_MAP_OFFSET_PCT,
                    -MAX_MAP_OFFSET_PCT,
                    MAX_MAP_OFFSET_PCT
                  );

                const markerClass =
                  user.mood_vibe
                    ? (VIBE_CLASSES[user.mood_vibe] ?? DEFAULT_MARKER)
                    : DEFAULT_MARKER;
                const isActive = selectedUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      setSelectedUser(isActive ? null : user)
                    }
                    title={`${user.first_name}, ${user.age} · ${user.distance_km.toFixed(1)} km away`}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition-transform hover:scale-110 ${markerClass} ${isActive ? 'scale-125 ring-4 ring-vibe-300/40 z-20' : 'z-10'}`}
                  >
                    {user.first_name.slice(0, 1).toUpperCase()}
                  </button>
                );
              })}

              {/* Empty state overlay */}
              {nearbyUsers.length === 0 && !loading && (
                <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                  <span className="text-xs text-vibe-600">
                    No one nearby yet
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selected user card */}
          {selectedUser && (
            <div className="card border border-vibe-600">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-vibe-100">
                    {selectedUser.first_name},{' '}
                    <span className="font-normal text-vibe-400">
                      {selectedUser.age}
                    </span>
                  </p>
                  <p className="text-sm text-vibe-500">{selectedUser.city}</p>
                  <p className="text-sm text-vibe-400 mt-1">
                    📍 {selectedUser.distance_km.toFixed(1)} km away
                  </p>
                  {selectedUser.mood_text && (
                    <div className="mt-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          VIBE_CLASSES[selectedUser.mood_vibe ?? ''] ??
                          DEFAULT_MARKER
                        }`}
                      >
                        {selectedUser.mood_vibe}
                      </span>
                      <p className="mt-2 text-sm text-vibe-200 italic">
                        &ldquo;{selectedUser.mood_text}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-vibe-500 hover:text-vibe-300 text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Nearby list */}
          {nearbyUsers.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-vibe-400 uppercase tracking-wider px-1">
                People nearby
              </h2>
              {nearbyUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() =>
                    setSelectedUser(
                      selectedUser?.id === user.id ? null : user
                    )
                  }
                  className={`w-full text-left card transition hover:border-vibe-500 ${
                    selectedUser?.id === user.id
                      ? 'border-vibe-400 bg-vibe-800/60'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold border-2 ${
                          user.mood_vibe
                            ? (VIBE_CLASSES[user.mood_vibe] ?? DEFAULT_MARKER)
                            : DEFAULT_MARKER
                        }`}
                      >
                        {user.first_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-vibe-100">
                          {user.first_name},{' '}
                          <span className="font-normal text-vibe-400">
                            {user.age}
                          </span>
                        </p>
                        {user.mood_text && (
                          <p className="text-xs text-vibe-400 truncate max-w-xs">
                            {user.mood_text}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-vibe-500 flex-shrink-0">
                      {user.distance_km.toFixed(1)} km
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
