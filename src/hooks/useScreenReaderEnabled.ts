import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Whether VoiceOver / TalkBack is on, kept up to date if it's switched while the app
// is open. False on the web and until the first answer arrives.
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (mounted) setEnabled(on);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}
