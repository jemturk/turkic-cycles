import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function CirclesLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ headerShown: true, title: t("tabs.circles") }} />
      <Stack.Screen name="[circleId]" />
    </Stack>
  );
}
