import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { formatDistanceToNowStrict } from "date-fns";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { useSession } from "@/hooks/useSession";
import { useMessageThreads } from "@/hooks/useChat";
import { useTypingMatches } from "@/hooks/useTypingMatches";
import { Avatar } from "@/components/Avatar";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";
import { EmptyState } from "@/components/EmptyState";
import { useIsOnline } from "@/hooks/useIsOnline";
import type { MessageThread } from "@/api/chat";

// How many messages are waiting, in a small coral pill.
function UnreadCount({ count }: { count: number }) {
  return (
    <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-500 px-1.5">
      <Text className="text-[11px] font-bold text-white">{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

// The conversation list: the whole Chat screen on a phone (one grouped list), and the
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
  const { data: threads, refetch, isRefetching, isError } = useMessageThreads(session?.user.id);
  const online = useIsOnline();
  const matchIds = useMemo(() => (threads ?? []).map((thread) => thread.matchId), [threads]);
  const typing = useTypingMatches(matchIds, session?.user.id);

  // While they're typing, "typing…" (as in the conversation's header) stands in for
  // the last message.
  function typingLine() {
    return (
      <Text className="text-sm font-medium text-primary-600 dark:text-primary-400" numberOfLines={1}>
        {t("chat.typing")}
      </Text>
    );
  }

  // Desktop web's left pane: compact rows, the open one highlighted.
  function renderCompactRow(thread: MessageThread) {
    const active = thread.matchId === activeMatchId;
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
          {typing.has(thread.matchId) ? (
            typingLine()
          ) : (
            <Text className="text-sm text-ink-700 dark:text-ink-200" numberOfLines={1}>
              {thread.lastMessageBody}
            </Text>
          )}
        </View>
        {thread.unreadCount > 0 ? (
          <UnreadCount count={thread.unreadCount} />
        ) : (
          <Text className="text-xs text-ink-700 dark:text-ink-200">
            {formatDistanceToNowStrict(new Date(thread.lastMessageAt), { addSuffix: false })}
          </Text>
        )}
      </Pressable>
    );
  }

  // Nothing to list: no chats yet, or (with nothing saved on the device) offline or
  // failed to load -- told apart, so a lost connection never reads as "no chats".
  // Still loading: nothing yet.
  function renderEmpty() {
    const label = !online
      ? t("chat.offlineEmpty")
      : isError && !threads
        ? t("chat.loadFailed")
        : threads
          ? t("chat.empty")
          : null;
    if (!label) return null;
    if (compact) return <Text className="px-2 text-base text-ink-700 dark:text-ink-200">{label}</Text>;
    return (
      <EmptyState icon={!online || !threads ? "cloud-offline-outline" : "chatbubbles-outline"} label={label} className="py-24" />
    );
  }

  return (
    <RefreshableScrollView
      refreshing={isRefetching}
      onRefresh={refetch}
      className={className}
      contentContainerClassName={compact ? "gap-1 pb-6" : "pb-10"}
      showsVerticalScrollIndicator={!compact}
    >
      {!threads || threads.length === 0 ? (
        renderEmpty()
      ) : compact ? (
        threads.map(renderCompactRow)
      ) : (
        // Phone: one grouped list with hairlines between conversations, like the
        // grouped Settings sections -- not a bordered card per conversation.
        <View className="overflow-hidden rounded-2xl bg-white dark:bg-ink-800">
          {threads.map((thread, index) => (
            <Pressable
              key={thread.matchId}
              onPress={() => onOpen(thread.matchId)}
              className={`flex-row items-center gap-3 px-4 py-3 ${
                index > 0 ? "border-t border-[#F3E3D2] dark:border-ink-700" : ""
              }`}
            >
              <Avatar uri={thread.otherAvatarUrl} name={thread.otherDisplayName} size={52} />
              <View className="flex-1 gap-0.5">
                <Text
                  className={`text-base text-ink-900 dark:text-ink-50 ${thread.unreadCount > 0 ? "font-bold" : "font-semibold"}`}
                  numberOfLines={1}
                >
                  {thread.otherDisplayName}
                </Text>
                {typing.has(thread.matchId) ? (
                  typingLine()
                ) : (
                  <Text
                    className={`text-sm ${
                      thread.unreadCount > 0
                        ? "font-medium text-ink-900 dark:text-ink-50"
                        : "text-ink-700 dark:text-ink-200"
                    }`}
                    numberOfLines={1}
                  >
                    {thread.lastMessageBody}
                  </Text>
                )}
              </View>
              <View className="items-end gap-1.5">
                <Text
                  className={`text-xs ${thread.unreadCount > 0 ? "font-semibold text-accent-600" : "text-ink-400 dark:text-ink-300"}`}
                >
                  {formatDistanceToNowStrict(new Date(thread.lastMessageAt), { addSuffix: false })}
                </Text>
                {thread.unreadCount > 0 ? <UnreadCount count={thread.unreadCount} /> : <View className="h-5" />}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </RefreshableScrollView>
  );
}
