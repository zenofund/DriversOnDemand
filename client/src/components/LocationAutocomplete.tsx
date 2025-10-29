/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface LocationAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  'data-testid'?: string;
}

// Singleton loader to avoid loading Google Maps multiple times
let loaderPromise: Promise<void> | null = null;

function getGoogleMapsLoader() {
  if (!loaderPromise) {
    loaderPromise = (async () => {
      // Check if already loaded
      if (window.google?.maps?.places) {
        return;
      }

      // Load the Google Maps JavaScript API script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=places&callback=Function.prototype`;
      script.async = true;
      script.defer = true;
      
      const loadPromise = new Promise<void>((resolve, reject) => {
        script.onload = () => {
          // Wait a bit for the libraries to initialize
          const checkLoaded = setInterval(() => {
            if (window.google?.maps?.places) {
              clearInterval(checkLoaded);
              resolve();
            }
          }, 50);
          
          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkLoaded);
            reject(new Error('Google Maps Places library failed to load'));
          }, 5000);
        };
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
      });
      
      document.head.appendChild(script);
      await loadPromise;
    })();
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
    if (!isLoaded || !inputRef.current) return;
    
    // Ensure Google Maps and places library are fully loaded
    if (!window.google?.maps?.places?.Autocomplete) {
      console.warn('Google Maps Places library not yet loaded');
      return;
    }

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
      if (listener && window.google?.maps?.event) {
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
