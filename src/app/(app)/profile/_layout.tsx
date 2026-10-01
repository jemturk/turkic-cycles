import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
