import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { ChatThreadList } from "@/components/ChatThreadList";
import { ChatBubblesIcon } from "@/components/ChatBubblesIcon";
import { useWideLayout } from "@/hooks/useWideLayout";

export default function Chat() {
  const { t } = useTranslation();
  const wide = useWideLayout();

  // Desktop: the list is already the left pane (chat/_layout.tsx), so this is the
  // empty right pane until a conversation is picked.
  if (wide) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-8 dark:bg-ink-800">
        <ChatBubblesIcon size={48} />
        <Text className="text-center text-base text-ink-700 dark:text-ink-200">{t("chat.selectConversation")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <ChatThreadList onOpen={(matchId) => router.push(`/(app)/chat/${matchId}`)} />
    </SafeAreaView>
  );
}
