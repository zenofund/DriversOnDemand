import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader as LoaderInstance } from '@googlemaps/js-api-loader';

interface LocationAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  'data-testid'?: string;
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
    const loader = new LoaderInstance({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      libraries: ['places'],
    });

    loader.load().then(() => {
      setIsLoaded(true);
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize autocomplete
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ng' }, // Restrict to Nigeria
      fields: ['formatted_address', 'geometry'],
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
        google.maps.event.removeListener(listener);
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
