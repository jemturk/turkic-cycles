import { canonicalCountry } from "@/constants/countries";

// Distances are stored in miles (matching_preferences.max_distance_miles, the matching
// model's units); members outside the few countries that use miles see and type km.
const MILES_COUNTRIES = ["United States", "United Kingdom", "Liberia", "Myanmar"];
const KM_PER_MILE = 1.609344;

export type DistanceUnit = "mi" | "km";

export function distanceUnitFor(country: string | null | undefined): DistanceUnit {
  return MILES_COUNTRIES.includes(canonicalCountry(country)) ? "mi" : "km";
}

// For display: whole units.
export function fromMiles(miles: number, unit: DistanceUnit): number {
  return unit === "mi" ? miles : Math.round(miles * KM_PER_MILE);
}

// For storage: whole miles, never 0 for a positive distance.
export function toMiles(value: number, unit: DistanceUnit): number {
  if (unit === "mi") return Math.round(value);
  return Math.max(1, Math.round(value / KM_PER_MILE));
}
