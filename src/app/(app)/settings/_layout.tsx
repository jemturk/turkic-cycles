import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";
import { useWideLayout } from "@/hooks/useWideLayout";

// A page reached directly (a link from another tab, a deep link) still has the Settings home
// under it, so its back button goes up to it rather than to whichever tab came before.
export const unstable_settings = { initialRouteName: "index" };

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
