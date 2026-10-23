import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

// Its own hidden tab (see (app)/_layout.tsx), like user/, me/ and plus/: Report is
// opened from a profile on any tab and from the Safety Center. Inside the Settings
// tab's folder, opening it from a profile left it stuck on that tab's stack -- the
// next visit to Settings showed the half-filled report, and its back button fell
// through to whichever tab came before.
export default function ReportLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
