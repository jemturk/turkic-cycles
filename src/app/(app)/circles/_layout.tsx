import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";
import { useWideLayout } from "@/hooks/useWideLayout";

// A page reached directly (a link from another tab, a notification, a deep link) still
// has the Circles list under it, so its back button goes up to it rather than to
// whichever tab came before.
export const unstable_settings = { anchor: "index" };

export default function CirclesLayout() {
  const { t } = useTranslation();
  const wide = useWideLayout();
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      {/* Desktop web draws its own large title row instead (CirclesDesktop). */}
      <Stack.Screen name="index" options={{ headerShown: !wide, title: t("tabs.circles") }} />
      <Stack.Screen name="new" />
      <Stack.Screen name="[circleId]" />
    </Stack>
  );
}
