import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader } from '@googlemaps/js-api-loader';

interface LocationAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

// Singleton loader to avoid loading Google Maps multiple times
let loaderPromise: Promise<typeof google> | null = null;

function getGoogleMapsLoader() {
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      libraries: ['places'],
    });
    loaderPromise = loader.load();
  }
  return loaderPromise;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Enter address",
  className = "",
  id,
  'data-testid': testId,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    getGoogleMapsLoader()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error: Error) => {
        console.error('Error loading Google Maps:', error);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google) return;

    // Initialize autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ng' }, // Restrict to Nigeria
      fields: ['formatted_address', 'geometry', 'place_id'],
    });

    // Handle place selection
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      
      if (place?.formatted_address && place?.geometry?.location) {
        const address = place.formatted_address;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        onChange(address, { lat, lng });
      }
    });

    return () => {
      if (listener) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, onChange]);

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value, { lat: 0, lng: 0 })}
      placeholder={placeholder}
      className={className}
      data-testid={testId}
    />
  );
}
