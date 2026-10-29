import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

// Whether the device is online -- the same signal that pauses and resumes queries and
// sends (lib/queryClient.ts wires it to expo-network).
export function useIsOnline() {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline()
  );
}
