import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";

export default function ChatLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={useStackScreenOptions()}>
      <Stack.Screen name="index" options={{ headerShown: true, title: t("tabs.chat") }} />
      <Stack.Screen name="[matchId]" />
    </Stack>
  );
}
