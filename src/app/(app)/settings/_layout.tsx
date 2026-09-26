import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
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
