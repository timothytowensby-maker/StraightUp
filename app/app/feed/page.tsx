'use client';

import { useCallback, useEffect, useState } from 'react';
import NearbyMoodMap from '@/components/NearbyMoodMap';
import { Mood } from '@/lib/types';

const GPS_CACHE_MAX_AGE_MS = 60000;
const GPS_REQUEST_TIMEOUT_MS = 10000;

type ViewerProfile = {
  city: string;
  share_location?: boolean;
};

type FetchMoodOptions = {
  mode?: 'city' | 'nearby';
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

export default function Feed() {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [moodText, setMoodText] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [mode, setMode] = useState<'city' | 'nearby'>('city');
  const [viewerLocation, setViewerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Using your city feed.');
  const [selectedMoodId, setSelectedMoodId] = useState<string | undefined>(undefined);

  const getToken = () => localStorage.getItem('token');

  const fetchMoods = useCallback(async (options?: FetchMoodOptions) => {
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      const nextMode = options?.mode ?? mode;

      if (!token) {
        setError('Please sign in again.');
        return;
      }

      const params = new URLSearchParams();
      if (nextMode === 'nearby' && options?.latitude !== undefined && options.longitude !== undefined) {
        params.set('nearby', 'true');
        params.set('latitude', String(options.latitude));
        params.set('longitude', String(options.longitude));
        params.set('radius_km', String(options.radiusKm ?? radiusKm));
      } else if (options?.city || cityFilter) {
        params.set('city', options?.city ?? cityFilter);
      }

      const response = await fetch(`/api/moods${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load moods');
      }

      const nextMoods = (data.moods as Mood[]) || [];
      setMode(nextMode);
      setMoods(nextMoods);
      setSelectedMoodId(nextMoods[0]?.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load moods');
    } finally {
      setLoading(false);
    }
  }, [cityFilter, mode, radiusKm]);

  const initializeFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = getToken();

      if (!token) {
        setError('Please sign in again.');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const profile = (await response.json()) as ViewerProfile;
      const nextCity = profile.city || '';

      setCityFilter(nextCity);
      setLocationSharing(Boolean(profile.share_location));
      setLocationStatus(nextCity ? `Using ${nextCity} as your fallback city feed.` : 'Using the global feed.');

      await fetchMoods({ mode: 'city', city: nextCity });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load your feed');
    } finally {
      setLoading(false);
    }
  }, [fetchMoods]);

  useEffect(() => {
    void initializeFeed();
  }, [initializeFeed]);

  useEffect(() => {
    if (mode === 'nearby' && viewerLocation) {
      void fetchMoods({
        mode: 'nearby',
        latitude: viewerLocation.latitude,
        longitude: viewerLocation.longitude,
        radiusKm,
      });
    }
  }, [fetchMoods, mode, radiusKm, viewerLocation]);

  const syncLocation = async (
    latitude: number,
    longitude: number,
    shareLocation: boolean
  ) => {
    const token = getToken();

    if (!token) {
      throw new Error('Please sign in again.');
    }

    const response = await fetch('/api/location', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        latitude,
        longitude,
        share_location: shareLocation,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to update your location');
    }
  };

  const refreshCurrentFeed = async () => {
    if (mode === 'nearby' && viewerLocation) {
      await fetchMoods({
        mode: 'nearby',
        latitude: viewerLocation.latitude,
        longitude: viewerLocation.longitude,
        radiusKm,
      });
      return;
    }

    await fetchMoods({ mode: 'city', city: cityFilter });
  };

  const handlePostMood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodText.trim()) return;

    try {
      setPosting(true);
      setError('');
      const token = getToken();

      if (!token) {
        setError('Please sign in again.');
        return;
      }

      const response = await fetch('/api/moods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ text: moodText }),
      });

      const data = await response.json();
      if (response.ok) {
        setMoodText('');
        await refreshCurrentFeed();
      } else {
        setError(data.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to post mood');
    } finally {
      setPosting(false);
    }
  };

  const handleResonate = async (moodId: string) => {
    try {
      setError('');
      const token = getToken();

      if (!token) {
        setError('Please sign in again.');
        return;
      }

      const response = await fetch('/api/resonates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ mood_id: moodId }),
      });

      if (response.ok) {
        await refreshCurrentFeed();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to resonate');
    }
  };

  const handleEnableNearby = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support GPS location.');
      return;
    }

    setLocationStatus('Requesting GPS access...');
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        void (async () => {
          try {
            setViewerLocation(nextLocation);
            await syncLocation(nextLocation.latitude, nextLocation.longitude, true);
            setLocationSharing(true);
            setLocationStatus(`Showing moods within ${radiusKm} km of your current location.`);
            await fetchMoods({
              mode: 'nearby',
              latitude: nextLocation.latitude,
              longitude: nextLocation.longitude,
              radiusKm,
            });
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unable to enable nearby mode');
            setLocationStatus('Falling back to your city feed.');
            await fetchMoods({ mode: 'city', city: cityFilter });
          }
        })();
      },
      () => {
        setLocationStatus('GPS permission denied. Falling back to your city feed.');
        void fetchMoods({ mode: 'city', city: cityFilter });
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_REQUEST_TIMEOUT_MS,
        maximumAge: GPS_CACHE_MAX_AGE_MS,
      }
    );
  };

  const handlePauseLocation = async () => {
    if (!viewerLocation) {
      setLocationSharing(false);
      setLocationStatus('Location sharing paused. Using your city feed.');
      await fetchMoods({ mode: 'city', city: cityFilter });
      return;
    }

    try {
      await syncLocation(viewerLocation.latitude, viewerLocation.longitude, false);
      setLocationSharing(false);
      setLocationStatus('Location sharing paused. Using your city feed.');
      await fetchMoods({ mode: 'city', city: cityFilter });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to pause location sharing');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-vibe-100">Where&apos;s your vibe?</h2>
            <p className="text-sm text-vibe-400">{locationStatus}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleEnableNearby} className="btn btn-primary">
              Use GPS nearby
            </button>
            <button type="button" onClick={handlePauseLocation} className="btn btn-secondary">
              Pause sharing
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto]">
          <input
            type="text"
            className="input"
            placeholder="Fallback city"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          />
          <select
            className="input"
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
          >
            {[5, 10, 25, 50].map((value) => (
              <option key={value} value={value}>
                {value} km
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              void fetchMoods({ mode: 'city', city: cityFilter });
            }}
          >
            Refresh city feed
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-vibe-400">
          <span className="badge">{mode === 'nearby' ? 'Nearby mode' : 'City mode'}</span>
          <span className="badge">{locationSharing ? 'Sharing location' : 'Location hidden'}</span>
        </div>
      </div>

      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">What&apos;s your vibe?</h2>
        <form onSubmit={handlePostMood} className="space-y-4">
          <textarea
            className="input h-20 resize-none"
            placeholder="Drop your mood... (max 180 chars)"
            value={moodText}
            onChange={(e) => setMoodText(e.target.value.slice(0, 180))}
            maxLength={180}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-vibe-400">{moodText.length}/180</span>
            <button
              type="submit"
              disabled={posting || !moodText.trim()}
              className="btn btn-primary"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 p-4 rounded-lg text-red-100 mb-4">
          {error}
        </div>
      )}

      {mode === 'nearby' && moods.length > 0 && (
        <NearbyMoodMap
          moods={moods}
          radiusKm={radiusKm}
          activeMoodId={selectedMoodId}
          onSelect={setSelectedMoodId}
        />
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-vibe-400">Loading moods...</div>
        ) : moods.length === 0 ? (
          <div className="text-center text-vibe-400">
            {mode === 'nearby'
              ? 'No nearby moods yet. Try a larger radius or switch back to city mode.'
              : 'No moods yet. Be the first!'}
          </div>
        ) : (
          moods.map((mood) => (
            <div key={mood.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{mood.first_name}, {mood.age}</h3>
                  <p className="text-sm text-vibe-400">{mood.city}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="badge">{mood.vibe}</span>
                  {mode === 'nearby' && mood.distance_km !== null && mood.distance_km !== undefined && (
                    <span className="text-xs text-vibe-400">{mood.distance_km} km away</span>
                  )}
                </div>
              </div>
              <p className="text-vibe-100 mb-4">{mood.text}</p>
              {mood.tags && mood.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {mood.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-vibe-700 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  void handleResonate(mood.id);
                }}
                className="btn btn-secondary w-full"
              >
                ✨ Resonate
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
