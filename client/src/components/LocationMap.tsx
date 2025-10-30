import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface LocationMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

export function LocationMap({ lat, lng, zoom = 15, className = '' }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      const loader = new Loader({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
      });

      const { Map } = await loader.importLibrary('maps');
      const { Marker } = await loader.importLibrary('marker');

      const position = { lat, lng };

      // Create map if it doesn't exist
      if (!googleMapRef.current) {
        googleMapRef.current = new Map(mapRef.current, {
          center: position,
          zoom: zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // Create marker
        markerRef.current = new Marker({
          position: position,
          map: googleMapRef.current,
          title: 'Your Location',
        });
      } else {
        // Update existing map and marker
        googleMapRef.current.setCenter(position);
        if (markerRef.current) {
          markerRef.current.setPosition(position);
        }
      }
    };

    initMap();
  }, [lat, lng, zoom]);

  return (
    <div 
      ref={mapRef} 
      className={`w-full h-full rounded-md ${className}`}
      data-testid="map-location"
    />
  );
}
