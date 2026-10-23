import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

// A page reached directly (a link from another tab, a notification, a deep link) still
// has the circle's page under it, so its back button goes up to it rather than to
// whichever tab came before.
export const unstable_settings = { initialRouteName: "index" };

export default function CircleLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
      <Stack.Screen name="events/new" />
      <Stack.Screen name="events/[eventId]" />
      <Stack.Screen name="members" />
      <Stack.Screen name="discover" />
    </Stack>
  );
}
