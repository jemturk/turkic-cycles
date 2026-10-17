import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";
import { useWideLayout } from "@/hooks/useWideLayout";

export default function SettingsLayout() {
  const { t } = useTranslation();
  const wide = useWideLayout();
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      {/* Desktop web draws its own large title instead. */}
      <Stack.Screen name="index" options={{ headerShown: !wide, title: t("tabs.settings") }} />
      <Stack.Screen name="account" />
      <Stack.Screen name="matching-preferences" />
      <Stack.Screen name="blocked-users" />
      <Stack.Screen name="static-page" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="safety" />
    </Stack>
  );
}
