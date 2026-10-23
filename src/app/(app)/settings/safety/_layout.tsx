import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

// A page reached directly (a link from another tab, a deep link) still has the Safety Center
// under it, so its back button goes up to it rather than to whichever tab came before.
export const unstable_settings = { initialRouteName: "index" };

export default function SafetyLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
      <Stack.Screen name="share-plans" />
    </Stack>
  );
}
