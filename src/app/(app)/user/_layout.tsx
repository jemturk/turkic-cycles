import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function UserLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="[userId]" />
    </Stack>
  );
}
