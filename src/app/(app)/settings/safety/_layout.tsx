import { Stack } from "expo-router";

export default function SafetyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="share-plans" />
      <Stack.Screen name="report" />
    </Stack>
  );
}
