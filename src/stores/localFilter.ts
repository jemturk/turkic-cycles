import { create } from "zustand";
import * as Location from "expo-location";

import { isWithinMiles, type Coordinates } from "@/lib/distance";

export const LOCAL_RADIUS_MILES = 50;

type LocalFilterStore = {
  enabled: boolean;
  origin: Coordinates | null;
  status: "idle" | "locating" | "denied" | "unavailable";
  setEnabled: (on: boolean) => Promise<void>;
};

// The circles page's "Local" switch: only circles within LOCAL_RADIUS_MILES of
// the device. Location is fetched fresh each time it's turned on,
// and the filter only switches on once a position is in hand -- otherwise the
// list would briefly show everything, then jump.
export const useLocalFilter = create<LocalFilterStore>((set) => ({
  enabled: false,
  origin: null,
  status: "idle",
  setEnabled: async (on) => {
    if (!on) {
      set({ enabled: false, status: "idle" });
      return;
    }
    set({ status: "locating" });
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      set({ enabled: false, status: "denied" });
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      set({
        enabled: true,
        status: "idle",
        origin: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      });
    } catch {
      set({ enabled: false, status: "unavailable" });
    }
  },
}));

// Returns a predicate that passes everything while the filter is off.
export function useIsNearby() {
  const enabled = useLocalFilter((s) => s.enabled);
  const origin = useLocalFilter((s) => s.origin);
  return (place: { latitude: number | null; longitude: number | null }) =>
    !enabled || !origin || isWithinMiles(place, origin, LOCAL_RADIUS_MILES);
}
