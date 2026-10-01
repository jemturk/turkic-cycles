import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function CirclesLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[circleId]" />
    </Stack>
  );
}
