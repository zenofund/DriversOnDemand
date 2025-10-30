import { useEffect, useRef } from 'react';
import { importLibrary } from '@googlemaps/js-api-loader';

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

      try {
        // Load the Maps library with API key configuration
        const { Map } = await importLibrary('maps', {
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
        }) as google.maps.MapsLibrary;

        // Load the Marker library
        const { Marker } = await importLibrary('marker', {
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
        }) as google.maps.MarkerLibrary;

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

          // Create marker using standard Marker (no mapId required)
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
      } catch (error) {
        console.error('Error loading Google Maps:', error);
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
