import { Stack } from "expo-router";

export default function CirclesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[circleId]/index" />
      <Stack.Screen name="[circleId]/members" />
    </Stack>
  );
}
