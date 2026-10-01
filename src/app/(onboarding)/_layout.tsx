import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function OnboardingLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
