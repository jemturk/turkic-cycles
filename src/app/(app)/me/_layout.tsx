import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

// A page reached directly (a link from another tab, a notification, a deep link) still
// has the your profile under it, so its back button goes up to it rather than to
// whichever tab came before.
export const unstable_settings = { anchor: "index" };

export default function MeLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
