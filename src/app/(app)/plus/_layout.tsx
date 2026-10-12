import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

// Its own hidden tab (see (app)/_layout.tsx), like user/ and me/: it's opened from
// both Settings and Connections, and living inside either tab's folder would leave
// it stuck on that tab's stack.
export default function PlusLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
