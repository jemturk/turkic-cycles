import { Platform } from "react-native";
import * as Location from "expo-location";

// Coordinates for a place name like "Apex, NC, United States", or null when they
// can't be had: geocodeAsync isn't available on web, Android needs location
// permission for it, and a lookup can simply fail. Callers treat null as "no
// coordinates" -- e.g. a circle without them just doesn't show under "Local".
export async function geocodePlace(query: string): Promise<{ latitude: number; longitude: number } | null> {
  if (Platform.OS === "web" || !query.trim()) return null;
  try {
    if (Platform.OS === "android") {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return null;
    }
    const [first] = await Location.geocodeAsync(query);
    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
  } catch {
    return null;
  }
}
