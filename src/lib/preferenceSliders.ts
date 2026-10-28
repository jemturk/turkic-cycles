import type { DistanceUnit } from "@/lib/distanceUnits";
import { fromMiles, toMiles } from "@/lib/distanceUnits";

// Matching preferences' sliders: stops on the track and what each one stores.

// Ages 18 to 80; the top stop is "80+", stored as no maximum.
export const AGE_MIN = 18;
export const AGE_TOP = 80;
export const AGE_STOPS = AGE_TOP - AGE_MIN + 1;

export function ageToIndex(age: number | null | undefined, fallback: number): number {
  if (age === null || age === undefined) return fallback;
  return Math.min(Math.max(Math.round(age), AGE_MIN), AGE_TOP) - AGE_MIN;
}

// [age_min, age_max] to save: the ends of the track mean no limit.
export function agesFromIndexes([low, high]: number[]): { ageMin?: number; ageMax?: number } {
  return {
    ageMin: low === 0 ? undefined : AGE_MIN + low,
    ageMax: high === AGE_STOPS - 1 ? undefined : AGE_MIN + high,
  };
}

// Distances in the member's own unit; the last stop is "Anywhere", stored as no limit.
const DISTANCE_STOPS: Record<DistanceUnit, number[]> = {
  mi: [5, 10, 25, 50, 75, 100, 150, 250, 500],
  km: [10, 25, 50, 100, 150, 250, 400, 800],
};

export function distanceStops(unit: DistanceUnit): (number | null)[] {
  return [...DISTANCE_STOPS[unit], null];
}

// The stop nearest a saved distance (miles), in the member's unit.
export function distanceToIndex(miles: number | null | undefined, unit: DistanceUnit): number {
  const stops = DISTANCE_STOPS[unit];
  if (!miles) return stops.length;
  const shown = fromMiles(miles, unit);
  let best = 0;
  stops.forEach((stop, i) => {
    if (Math.abs(stop - shown) < Math.abs(stops[best] - shown)) best = i;
  });
  return best;
}

export function milesFromIndex(index: number, unit: DistanceUnit): number | undefined {
  const stop = distanceStops(unit)[index];
  return stop === null || stop === undefined ? undefined : toMiles(stop, unit);
}
