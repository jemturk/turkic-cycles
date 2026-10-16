import { Pressable, View } from "react-native";
import { formatDistanceToNowStrict } from "date-fns";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { useSession } from "@/hooks/useSession";
import { useMessageThreads } from "@/hooks/useChat";
import { Avatar } from "@/components/Avatar";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";

// The conversation list: the whole Chat screen on a phone (bordered cards), and the
// left pane beside the open conversation on desktop web (chat/_layout.tsx: compact
// rows), where activeMatchId highlights the one that's open.
export function ChatThreadList({
  activeMatchId,
  onOpen,
  compact = false,
  className = "flex-1 px-6 pt-4",
}: {
  activeMatchId?: string;
  onOpen: (matchId: string) => void;
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const { data: threads, refetch, isRefetching } = useMessageThreads(session?.user.id);

  return (
    <RefreshableScrollView
      refreshing={isRefetching}
      onRefresh={refetch}
      className={className}
      contentContainerClassName={compact ? "gap-1 pb-6" : "gap-4 pb-10"}
      showsVerticalScrollIndicator={!compact}
    >
      {!threads || threads.length === 0 ? (
        <Text className={`text-base text-ink-700 dark:text-ink-200 ${compact ? "px-2" : ""}`}>{t("chat.empty")}</Text>
      ) : (
        threads.map((thread) => {
          const active = thread.matchId === activeMatchId;
          if (compact) {
            return (
              <Pressable
                key={thread.matchId}
                aria-current={active ? "page" : undefined}
                className={`flex-row items-center gap-3 rounded-[14px] p-3 ${
                  active ? "bg-primary-100 dark:bg-ink-700" : "web:hover:bg-primary-100/40 dark:web:hover:bg-ink-700"
                }`}
                onPress={() => onOpen(thread.matchId)}
              >
                <Avatar uri={thread.otherAvatarUrl} name={thread.otherDisplayName} size={48} />
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-semibold text-ink-900 dark:text-ink-50" numberOfLines={1}>
                    {thread.otherDisplayName}
                  </Text>
                  <Text className="text-sm text-ink-700 dark:text-ink-200" numberOfLines={1}>
                    {thread.lastMessageBody}
                  </Text>
                </View>
                {/* Unread: the coral dot stands in for the time, as in the mockup. */}
                {thread.unreadCount > 0 ? (
                  <View className="h-2.5 w-2.5 rounded-full bg-accent-500" />
                ) : (
                  <Text className="text-xs text-ink-700 dark:text-ink-200">
                    {formatDistanceToNowStrict(new Date(thread.lastMessageAt), { addSuffix: false })}
                  </Text>
                )}
              </Pressable>
            );
          }
          return (
            <Pressable
              key={thread.matchId}
              aria-current={active ? "page" : undefined}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 ${
                active
                  ? "border-primary-400 bg-primary-100 dark:border-primary-400 dark:bg-ink-700"
                  : "border-primary-100 bg-white dark:border-ink-700 dark:bg-ink-800"
              }`}
              onPress={() => onOpen(thread.matchId)}
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
          );
        })
      )}
    </RefreshableScrollView>
  );
}
