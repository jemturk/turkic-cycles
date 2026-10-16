import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";
import { useWideLayout } from "@/hooks/useWideLayout";

export default function ConnectionsLayout() {
  const { t } = useTranslation();
  const wide = useWideLayout();
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      {/* Desktop web draws its own large title row instead. */}
      <Stack.Screen name="index" options={{ headerShown: !wide, title: t("tabs.connections") }} />
    </Stack>
  );
}
