'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import NearbyDistanceSelector from '@/components/NearbyDistanceSelector';
import NearbyMoodMap from '@/components/NearbyMoodMap';
import NearbySkeleton from '@/components/NearbySkeleton';
import { useLocation, type LocationCoords } from '@/hooks/useLocation';
import { useNearbyFeed } from '@/hooks/useNearbyFeed';
import {
  DEFAULT_NEARBY_DISTANCE_MILES,
  kilometersToMiles,
  normalizeNearbyDistanceMiles,
} from '@/lib/nearby';
import { Mood } from '@/lib/types';

function getStoredToken() {
  return localStorage.getItem('token');
}

type ViewerProfile = {
  city: string;
  share_location?: boolean;
};

type CityFeedOptions = {
  city?: string;
};

function getNearbyStatusMessage(distanceMiles: number) {
  return `Showing vibes within ${distanceMiles} miles of your current location.`;
}

export default function Feed() {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [locationUpdating, setLocationUpdating] = useState(false);
  const [moodText, setMoodText] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [distanceMiles, setDistanceMiles] = useState(DEFAULT_NEARBY_DISTANCE_MILES);
  const [mode, setMode] = useState<'city' | 'nearby'>('city');
  const [viewerLocation, setViewerLocation] = useState<LocationCoords | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Using your city feed.');
  const [selectedMoodId, setSelectedMoodId] = useState<string | undefined>(undefined);

  const {
    coords,
    errorCode: locationErrorCode,
    errorMessage: locationErrorMessage,
    isLoading: locationLoading,
    refresh: refreshLocation,
  } = useLocation();

  const nearbyFeed = useNearbyFeed(viewerLocation, distanceMiles, mode === 'nearby');

  const fetchCityMoods = useCallback(
    async (options?: CityFeedOptions) => {
      try {
        setLoading(true);
        setError('');
        const token = getStoredToken();

        if (!token) {
          setError('Please sign in again.');
          return;
        }

        const nextCity = options?.city ?? cityFilter;
        const params = new URLSearchParams();

        if (nextCity) {
          params.set('city', nextCity);
        }

        const response = await fetch(`/api/moods${params.toString() ? `?${params.toString()}` : ''}`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load moods');
        }

        const nextMoods = (data.moods as Mood[]) || [];
        setMode('city');
        setMoods(nextMoods);
      } catch (fetchError: unknown) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load moods');
      } finally {
        setLoading(false);
      }
    },
    [cityFilter]
  );

  const initializeFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = getStoredToken();

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

      await fetchCityMoods({ city: nextCity });
    } catch (fetchError: unknown) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load your feed');
    } finally {
      setLoading(false);
    }
  }, [fetchCityMoods]);

  useEffect(() => {
    void initializeFeed();
  }, [initializeFeed]);

  useEffect(() => {
    if (mode === 'nearby' && viewerLocation) {
      setLocationStatus(getNearbyStatusMessage(distanceMiles));
    }
  }, [distanceMiles, mode, viewerLocation]);

  useEffect(() => {
    if (mode === 'city' && !viewerLocation && locationErrorMessage) {
      setLocationStatus(locationErrorMessage);
    }
  }, [locationErrorMessage, mode, viewerLocation]);

  const displayedMoods = useMemo(
    () => (mode === 'nearby' ? nearbyFeed.data?.moods ?? [] : moods),
    [mode, moods, nearbyFeed.data]
  );

  const feedLoading = mode === 'nearby' ? nearbyFeed.isLoading : loading;
  const pageError = error || (mode === 'nearby' ? nearbyFeed.error : '');
  const isRefreshingLocation = locationLoading || locationUpdating;

  useEffect(() => {
    setSelectedMoodId(displayedMoods[0]?.id);
  }, [displayedMoods]);

  const syncLocation = async (
    latitude: number,
    longitude: number,
    shareLocation: boolean
  ) => {
    const token = getStoredToken();

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

  const fallbackToCityFeed = useCallback(
    async (statusMessage: string) => {
      setViewerLocation(null);
      setMode('city');
      setLocationSharing(false);
      setLocationStatus(statusMessage);
      await fetchCityMoods({ city: cityFilter });
    },
    [cityFilter, fetchCityMoods]
  );

  const enableNearbyWithPosition = useCallback(
    async (nextLocation: LocationCoords) => {
      try {
        setLocationUpdating(true);
        setError('');
        await syncLocation(nextLocation.latitude, nextLocation.longitude, true);
        setViewerLocation(nextLocation);
        setMode('nearby');
        setLocationSharing(true);
        setLocationStatus(getNearbyStatusMessage(distanceMiles));
      } catch (syncError: unknown) {
        setError(syncError instanceof Error ? syncError.message : 'Unable to enable nearby mode');
        await fallbackToCityFeed('We couldn’t refresh your GPS location, so your city feed is still active.');
      } finally {
        setLocationUpdating(false);
      }
    },
    [distanceMiles, fallbackToCityFeed]
  );

  const refreshCurrentFeed = async () => {
    if (mode === 'nearby' && viewerLocation) {
      await nearbyFeed.refresh(viewerLocation);
      return;
    }

    await fetchCityMoods({ city: cityFilter });
  };

  const handlePostMood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodText.trim()) return;

    try {
      setPosting(true);
      setError('');
      const token = getStoredToken();

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
    } catch (postError: unknown) {
      setError(postError instanceof Error ? postError.message : 'Unable to post mood');
    } finally {
      setPosting(false);
    }
  };

  const handleResonate = async (moodId: string) => {
    try {
      setError('');
      const token = getStoredToken();

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
    } catch (resonateError: unknown) {
      setError(resonateError instanceof Error ? resonateError.message : 'Unable to resonate');
    }
  };

  const handleEnableNearby = async () => {
    setLocationStatus('Requesting GPS access...');
    setError('');

    const nextLocation = coords ?? (await refreshLocation());

    if (!nextLocation) {
      await fallbackToCityFeed(
        locationErrorMessage || 'We couldn’t get your GPS location, so your city feed is still active.'
      );
      return;
    }

    await enableNearbyWithPosition(nextLocation);
  };

  const handleRefreshLocation = async () => {
    setLocationStatus('Refreshing your GPS location...');
    setError('');

    const nextLocation = await refreshLocation();

    if (!nextLocation) {
      await fallbackToCityFeed(
        locationErrorMessage || 'We couldn’t refresh your GPS location, so your city feed is still active.'
      );
      return;
    }

    await enableNearbyWithPosition(nextLocation);
  };

  const handlePauseLocation = async () => {
    if (!viewerLocation) {
      setViewerLocation(null);
      setLocationSharing(false);
      setLocationStatus('Location sharing paused. Using your city feed.');
      await fetchCityMoods({ city: cityFilter });
      return;
    }

    try {
      setLocationUpdating(true);
      await syncLocation(viewerLocation.latitude, viewerLocation.longitude, false);
      setViewerLocation(null);
      setLocationSharing(false);
      setLocationStatus('Location sharing paused. Using your city feed.');
      await fetchCityMoods({ city: cityFilter });
    } catch (pauseError: unknown) {
      setError(pauseError instanceof Error ? pauseError.message : 'Unable to pause location sharing');
    } finally {
      setLocationUpdating(false);
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
            <button
              type="button"
              onClick={() => {
                void handleEnableNearby();
              }}
              className="btn btn-primary"
              disabled={isRefreshingLocation}
            >
              {isRefreshingLocation && mode !== 'nearby' ? 'Locating...' : 'Use GPS nearby'}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleRefreshLocation();
              }}
              className="btn btn-secondary"
              disabled={isRefreshingLocation}
            >
              {isRefreshingLocation && mode === 'nearby' ? 'Refreshing...' : 'Refresh Location'}
            </button>
            <button
              type="button"
              onClick={() => {
                void handlePauseLocation();
              }}
              className="btn btn-secondary"
              disabled={locationUpdating}
            >
              Pause sharing
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-vibe-300">Nearby distance</p>
            <NearbyDistanceSelector
              value={distanceMiles}
              onChange={(nextDistanceMiles) => setDistanceMiles(normalizeNearbyDistanceMiles(nextDistanceMiles))}
              disabled={feedLoading && mode === 'nearby'}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              className="input"
              placeholder="Fallback city"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                void fetchCityMoods({ city: cityFilter });
              }}
            >
              Refresh city feed
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-vibe-400">
          <span className="badge">{mode === 'nearby' ? 'Nearby mode' : 'City mode'}</span>
          <span className="badge">{locationSharing ? 'Sharing location' : 'Location hidden'}</span>
          <span className="badge">{distanceMiles} mile radius</span>
        </div>

        {!viewerLocation && locationErrorCode && (
          <div className="mt-4 rounded-2xl border border-vibe-700 bg-vibe-950/70 p-4 text-sm text-vibe-200">
            {locationErrorMessage}
          </div>
        )}
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

      {pageError && (
        <div className="bg-red-900 border border-red-700 p-4 rounded-lg text-red-100 mb-4">
          {pageError}
        </div>
      )}

      {mode === 'nearby' && displayedMoods.length > 0 && (
        <NearbyMoodMap
          moods={displayedMoods}
          radiusMiles={distanceMiles}
          activeMoodId={selectedMoodId}
          onSelect={setSelectedMoodId}
        />
      )}

      <div className="space-y-4">
        {feedLoading ? (
          <NearbySkeleton />
        ) : displayedMoods.length === 0 ? (
          <div className="card text-center text-vibe-300">
            {mode === 'nearby'
              ? 'No nearby vibes right now. Try expanding to 25 miles or refresh your location.'
              : 'No moods yet. Be the first!'}
          </div>
        ) : (
          displayedMoods.map((mood) => {
            const distanceAway =
              mode === 'nearby' && mood.distance_km !== null && mood.distance_km !== undefined
                ? `${kilometersToMiles(mood.distance_km).toFixed(1)} miles away`
                : null;

            return (
              <div key={mood.id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{mood.first_name}, {mood.age}</h3>
                    <p className="text-sm text-vibe-400">{mood.city}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="badge">{mood.vibe}</span>
                    {distanceAway && <span className="text-xs text-vibe-400">{distanceAway}</span>}
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
            );
          })
        )}
      </div>
    </div>
  );
}
