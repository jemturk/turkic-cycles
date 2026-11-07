import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// A small buzz for the moments that should feel physical: answering someone on
// Discover, a match, sending a message. Nothing on web (no vibration there), and a
// phone without haptics just stays still.
export type HapticKind = "light" | "medium" | "selection" | "success" | "warning";

export function haptic(kind: HapticKind) {
  if (Platform.OS === "web") return;
  const done =
    kind === "selection"
      ? Haptics.selectionAsync()
      : kind === "success" || kind === "warning"
        ? Haptics.notificationAsync(
            kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
          )
        : Haptics.impactAsync(kind === "light" ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
  done.catch(() => {});
}
