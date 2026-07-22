'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import {
  DEFAULT_NEARBY_DISTANCE_MILES,
  milesToMeters,
  normalizeNearbyDistanceMiles,
} from '@/lib/nearby';
import { Mood } from '@/lib/types';
import { LocationCoords } from './useLocation';

type NearbyFeedData = {
  moods: Mood[];
  count: number;
};

function buildNearbyRequestKey(coords: LocationCoords, distanceMiles: number) {
  const params = new URLSearchParams({
    nearby: 'true',
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    distance: String(milesToMeters(distanceMiles)),
  });

  return `/api/moods?${params.toString()}`;
}

export function useNearbyFeed(
  coords: LocationCoords | null,
  distanceMiles: number = DEFAULT_NEARBY_DISTANCE_MILES,
  enabled = true
) {
  const [data, setData] = useState<NearbyFeedData | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sanitizedDistanceMiles = normalizeNearbyDistanceMiles(distanceMiles);

  const requestKey = useMemo(() => {
    if (!coords || !enabled) {
      return null;
    }

    return buildNearbyRequestKey(coords, sanitizedDistanceMiles);
  }, [coords, enabled, sanitizedDistanceMiles]);

  const refresh = useCallback(
    async (nextCoords?: LocationCoords | null) => {
      const targetCoords = nextCoords ?? coords;

      if (!enabled || !targetCoords) {
        setData(null);
        setError('');
        setIsLoading(false);
        return null;
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await fetchWithAuth(buildNearbyRequestKey(targetCoords, sanitizedDistanceMiles));
        const payload = (await response.json()) as NearbyFeedData & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load nearby vibes');
        }

        setData({
          moods: payload.moods || [],
          count: payload.count ?? payload.moods?.length ?? 0,
        });

        return payload;
      } catch (fetchError: unknown) {
        setData(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load nearby vibes');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [coords, enabled, sanitizedDistanceMiles]
  );

  useEffect(() => {
    if (!requestKey) {
      setData(null);
      setError('');
      setIsLoading(false);
      return;
    }

    void refresh();
  }, [refresh, requestKey]);

  return {
    data,
    error,
    isLoading,
    requestKey,
    refresh,
  };
}
