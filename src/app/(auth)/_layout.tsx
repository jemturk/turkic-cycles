import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function AuthLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
