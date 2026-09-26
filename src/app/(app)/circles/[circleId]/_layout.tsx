import { Stack } from "expo-router";

export default function CircleLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="members" />
      <Stack.Screen name="discover" />
    </Stack>
  );
}
