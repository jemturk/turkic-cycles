import { View } from "react-native";
import { Stack, router, useGlobalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStackScreenOptions } from "@/hooks/useStackScreenOptions";
import { useWideLayout } from "@/hooks/useWideLayout";
import { Text } from "@/components/Text";
import { ChatThreadList } from "@/components/ChatThreadList";

// A page reached directly (a link from another tab, a notification, a deep link) still
// has the chat list under it, so its back button goes up to it rather than to
// whichever tab came before.
export const unstable_settings = { anchor: "index" };

export default function ChatLayout() {
  const { t } = useTranslation();
  const wide = useWideLayout();
  const stackScreenOptions = useStackScreenOptions();
  const { matchId } = useGlobalSearchParams<{ matchId?: string }>();

  if (wide) {
    // Desktop: two panes, like WhatsApp Web -- the conversation list (with the
    // screen's title, in place of AppHeader) stays on the left and the stack (an
    // empty-state index, or the open thread) fills the right. Switching threads
    // replaces rather than pushes, so Back leaves Chat instead of stepping through
    // every conversation that was clicked.
    return (
      <View className="flex-1 bg-primary-50 dark:bg-ink-950">
        {/* Ends where the Discover / Connections grids do: 4 cards of 300 + 3 gaps of 20. */}
        <View className="w-full max-w-[1420px] flex-1 flex-row gap-5 px-20 py-5">
          <View className="w-[340px] gap-2 overflow-hidden rounded-[22px] bg-white px-3 pt-5 dark:bg-ink-800">
            <Text className="mx-2 mb-1 font-display text-[28px] text-ink-900 dark:text-ink-50">{t("tabs.chat")}</Text>
            <ChatThreadList
              activeMatchId={matchId}
              onOpen={(id) => router.replace(`/(app)/chat/${id}`, { withAnchor: true })}
              compact
              className="flex-1"
            />
          </View>
          <View className="flex-1 overflow-hidden rounded-[22px] bg-white dark:bg-ink-800">
            <Stack screenOptions={stackScreenOptions}>
              <Stack.Screen name="index" />
              <Stack.Screen name="[matchId]" options={{ animation: "none" }} />
            </Stack>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: true, title: t("tabs.chat") }} />
      <Stack.Screen name="[matchId]" />
    </Stack>
  );
}
