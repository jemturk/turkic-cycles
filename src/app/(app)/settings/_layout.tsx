import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="matching-preferences" />
      <Stack.Screen name="blocked-users" />
      <Stack.Screen name="static-page" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="safety" />
    </Stack>
  );
}
