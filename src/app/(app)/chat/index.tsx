import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { formatDistanceToNowStrict } from "date-fns";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMessageThreads } from "@/hooks/useChat";
import { Avatar } from "@/components/Avatar";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";

export default function Chat() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { data: threads, refetch, isRefetching } = useMessageThreads(session?.user.id);

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right", "bottom"]}>
      <RefreshableScrollView
        refreshing={isRefetching}
        onRefresh={refetch}
        className="flex-1 px-6 pt-4"
        contentContainerClassName="gap-4 pb-10"
      >
        {!threads || threads.length === 0 ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("chat.empty")}</Text>
        ) : (
          threads.map((thread) => (
            <Pressable
              key={thread.matchId}
              className="flex-row items-center gap-3 rounded-2xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4"
              onPress={() => router.push(`/(app)/chat/${thread.matchId}`)}
            >
              <Avatar uri={thread.otherAvatarUrl} name={thread.otherDisplayName} size={48} />

              <View className="flex-1 gap-0.5">
                <Text className="font-display text-lg text-ink-900 dark:text-ink-50">{thread.otherDisplayName}</Text>
                <Text className="text-sm text-ink-700 dark:text-ink-200" numberOfLines={1}>
                  {thread.lastMessageBody}
                </Text>
              </View>

              <View className="items-end gap-1">
                <Text className="text-xs text-ink-400">
                  {formatDistanceToNowStrict(new Date(thread.lastMessageAt), { addSuffix: false })}
                </Text>
                {thread.unreadCount > 0 ? <View className="h-2.5 w-2.5 rounded-full bg-accent-500" /> : null}
              </View>
            </Pressable>
          ))
        )}
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
