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
  const ignoreNextChange = useRef(false);

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
      fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id'],
    });

    // Handle place selection
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      
      if (place?.geometry?.location) {
        // Build human-readable address from components
        let humanReadableAddress = '';
        
        // Use the place name if available (e.g., "Kagini Primary Health Center")
        if (place.name) {
          humanReadableAddress = place.name;
        }
        
        // Add city (locality)
        const city = place.address_components?.find(
          comp => comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')
        )?.long_name;
        
        if (city) {
          humanReadableAddress += humanReadableAddress ? `, ${city}` : city;
        }
        
        // Add country
        const country = place.address_components?.find(
          comp => comp.types.includes('country')
        )?.long_name;
        
        if (country) {
          humanReadableAddress += humanReadableAddress ? `, ${country}` : country;
        }
        
        // Fallback to formatted_address if we couldn't build a good one
        const finalAddress = humanReadableAddress || place.formatted_address || '';
        
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        // Set flag to ignore the next onChange event from the input
        ignoreNextChange.current = true;
        
        // Force update the input value to ensure it stays after selection
        if (inputRef.current) {
          inputRef.current.value = finalAddress;
        }
        
        // Use setTimeout to ensure state update happens after Google's DOM manipulation
        setTimeout(() => {
          onChange(finalAddress, { lat, lng });
        }, 0);
      }
    });

    return () => {
      if (listener && window.google?.maps?.event) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Skip onChange if this was triggered by autocomplete selection
    if (ignoreNextChange.current) {
      ignoreNextChange.current = false;
      return;
    }
    // Only update with manual input (no coordinates)
    onChange(e.target.value, { lat: 0, lng: 0 });
  };

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      data-testid={testId}
    />
  );
}
