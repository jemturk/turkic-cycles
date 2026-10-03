import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function CircleLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
      <Stack.Screen name="events/[eventId]" />
      <Stack.Screen name="members" />
      <Stack.Screen name="discover" />
    </Stack>
  );
}
