export type Coordinates = { latitude: number; longitude: number };

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

// Great-circle (haversine) distance.
export function milesBetween(a: Coordinates, b: Coordinates) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

// Places without coordinates count as nearby from anywhere, rather than vanishing
// from a filtered list.
export function isWithinMiles(
  place: { latitude: number | null; longitude: number | null },
  origin: Coordinates,
  miles: number
) {
  if (place.latitude == null || place.longitude == null) return true;
  return milesBetween(origin, { latitude: place.latitude, longitude: place.longitude }) <= miles;
}
