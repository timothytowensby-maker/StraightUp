'use client';

import { useCallback, useEffect, useState } from 'react';

export type LocationCoords = {
  latitude: number;
  longitude: number;
};

export type LocationErrorCode =
  | 'permission-denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'
  | 'unknown'
  | null;

const GPS_CACHE_MAX_AGE_MILLISECONDS = 60000;
const GPS_REQUEST_TIMEOUT_MILLISECONDS = 10000;

function getLocationErrorDetails(error: GeolocationPositionError | null) {
  if (!error) {
    return {
      code: 'unsupported' as const,
      message: 'GPS is not supported in this browser. We’ll keep showing your city feed.',
    };
  }

  switch (error.code) {
    case error.PERMISSION_DENIED:
      return {
        code: 'permission-denied' as const,
        message: 'GPS permission was denied. Enable location access to use Nearby Mode.',
      };
    case error.POSITION_UNAVAILABLE:
      return {
        code: 'unavailable' as const,
        message: 'Your location is currently unavailable. Try refreshing to request GPS again.',
      };
    case error.TIMEOUT:
      return {
        code: 'timeout' as const,
        message: 'GPS took too long to respond. Try refreshing your location again.',
      };
    default:
      return {
        code: 'unknown' as const,
        message: 'We couldn’t read your GPS location. Try refreshing to request it again.',
      };
  }
}

export function useLocation() {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [errorCode, setErrorCode] = useState<LocationErrorCode>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!navigator.geolocation) {
      const details = getLocationErrorDetails(null);
      setCoords(null);
      setErrorCode(details.code);
      setErrorMessage(details.message);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setErrorCode(null);
    setErrorMessage('');

    return new Promise<LocationCoords | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          setCoords(nextCoords);
          setErrorCode(null);
          setErrorMessage('');
          setIsLoading(false);
          resolve(nextCoords);
        },
        (error) => {
          const details = getLocationErrorDetails(error);

          setCoords(null);
          setErrorCode(details.code);
          setErrorMessage(details.message);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: GPS_REQUEST_TIMEOUT_MILLISECONDS,
          maximumAge: GPS_CACHE_MAX_AGE_MILLISECONDS,
        }
      );
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    coords,
    errorCode,
    errorMessage,
    isLoading,
    refresh,
  };
}
