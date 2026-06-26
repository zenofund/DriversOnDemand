import { useState, useEffect } from 'react';

export interface GeolocationCoordinates {
  lat: number;
  lng: number;
}

export interface GeolocationState {
  coordinates: GeolocationCoordinates | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation(watch: boolean = false) {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    loading: false,
    error: null,
  });

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setState({
        coordinates: null,
        loading: false,
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          loading: false,
          error: null,
        });
      },
      (error) => {
        let errorMessage = 'Failed to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        setState({
          coordinates: null,
          loading: false,
          error: errorMessage,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (watch) {
      getCurrentPosition();
    }
  }, [watch]);

  return {
    ...state,
    getCurrentPosition,
  };
}
