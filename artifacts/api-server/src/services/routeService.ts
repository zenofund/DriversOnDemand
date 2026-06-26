const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY!;

interface Coordinates {
  lat: number;
  lng: number;
}

interface DistanceMatrixResult {
  distance_km: number;
  duration_minutes: number;
  duration_in_traffic_minutes?: number;
}

/**
 * Get real driving distance and duration using Google Distance Matrix API
 */
export async function getRealDistanceAndDuration(
  origin: Coordinates,
  destination: Coordinates
): Promise<DistanceMatrixResult | null> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.append('origins', `${origin.lat},${origin.lng}`);
    url.searchParams.append('destinations', `${destination.lat},${destination.lng}`);
    url.searchParams.append('mode', 'driving');
    url.searchParams.append('departure_time', 'now'); // For traffic data
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows[0]?.elements[0]) {
      console.error('Distance Matrix API error:', data.status);
      return null;
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      console.error('Route not found');
      return null;
    }

    return {
      distance_km: element.distance.value / 1000, // Convert meters to km
      duration_minutes: element.duration.value / 60, // Convert seconds to minutes
      duration_in_traffic_minutes: element.duration_in_traffic 
        ? element.duration_in_traffic.value / 60 
        : undefined,
    };
  } catch (error) {
    console.error('Error fetching distance matrix:', error);
    return null;
  }
}

/**
 * Calculate if driver is within geofence radius of a location
 */
export function isWithinGeofence(
  driverLocation: Coordinates,
  targetLocation: Coordinates,
  radiusKm: number = 0.5 // Default 500 meters
): boolean {
  const earthRadiusKm = 6371;

  const dLat = (targetLocation.lat - driverLocation.lat) * (Math.PI / 180);
  const dLon = (targetLocation.lng - driverLocation.lng) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(driverLocation.lat * (Math.PI / 180)) *
    Math.cos(targetLocation.lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadiusKm * c;

  return distance <= radiusKm;
}

/**
 * Get optimized route waypoints
 */
export async function getOptimizedRoute(
  origin: Coordinates,
  destination: Coordinates,
  waypoints?: Coordinates[]
): Promise<any> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.append('origin', `${origin.lat},${origin.lng}`);
    url.searchParams.append('destination', `${destination.lat},${destination.lng}`);
    
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints
        .map(w => `${w.lat},${w.lng}`)
        .join('|');
      url.searchParams.append('waypoints', `optimize:true|${waypointsStr}`);
    }
    
    url.searchParams.append('mode', 'driving');
    url.searchParams.append('departure_time', 'now');
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Directions API error:', data.status);
      return null;
    }

    return data.routes[0];
  } catch (error) {
    console.error('Error fetching optimized route:', error);
    return null;
  }
}

/**
 * Calculate estimated time of arrival
 */
export function calculateETA(durationMinutes: number): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + durationMinutes);
  return now;
}
