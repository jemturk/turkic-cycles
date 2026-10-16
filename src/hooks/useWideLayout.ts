import { Platform, useWindowDimensions } from "react-native";

// From this width a browser window gets the desktop layout: the brand panel beside
// the framed app on signed-out screens (AppFrame), and the sidebar instead of the
// bottom tab bar once signed in ((app)/_layout.tsx). Native is always the phone layout.
export const WIDE_VIEWPORT = 1024;

export function useWideLayout(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= WIDE_VIEWPORT;
}
