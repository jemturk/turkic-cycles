import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function SettingsLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ headerShown: true, title: t("tabs.settings") }} />
      <Stack.Screen name="account" />
      <Stack.Screen name="matching-preferences" />
      <Stack.Screen name="blocked-users" />
      <Stack.Screen name="static-page" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="safety" />
    </Stack>
  );
}
