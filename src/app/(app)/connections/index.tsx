import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMessageThreads, useNewConnections } from "@/hooks/useChat";
import { calculateAge } from "@/lib/age";
import { Avatar } from "@/components/Avatar";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";
import type { MatchWithParticipant, MessageThread } from "@/api/chat";

type Tab = "matched" | "connected";

const GRID_GAP = 12;
const GRID_COLUMNS = 2;

function PersonCard({
  person,
  width,
  unreadCount,
  onPress,
  onQuickChat,
}: {
  person: MatchWithParticipant;
  width: number;
  unreadCount?: number;
  onPress: () => void;
  onQuickChat?: () => void;
}) {
  const { t } = useTranslation();
  const age = person.otherBirthdate ? calculateAge(person.otherBirthdate) : undefined;
  const location = [person.otherCity, person.otherState, person.otherCountry].filter(Boolean).join(", ");
  const meta = [age ? `${age}` : null, location || null].filter(Boolean).join(" · ");

  return (
    <Pressable
      className="items-center justify-center gap-2 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-2"
      style={{ width, aspectRatio: 1 }}
      onPress={onPress}
    >
      {unreadCount && !onQuickChat ? (
        <View className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-coral-500" />
      ) : null}

      <Avatar uri={person.otherAvatarUrl} name={person.otherDisplayName} size={56} />

      {/* w-full is load-bearing: with the Pressable's own items-center, a shrink-
          wrapped child never gets a bounded width to truncate against, so long
          content (e.g. "Apex, NC, United States") renders past the card's edge
          instead of ellipsizing. */}
      <View className="w-full items-center gap-0.5 px-1">
        <Text className="font-display text-sm text-ink-900 dark:text-ink-50" numberOfLines={1}>
          {person.otherDisplayName}
        </Text>
        {meta ? (
          <Text className="text-xs text-ink-400" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      {/* Top corner, not bottom: the square card has spare room above the avatar,
          while the bottom corner sits on the meta line and covers the location.
          The unread dot rides on this button so the two don't fight for the corner. */}
      {onQuickChat ? (
        <Pressable
          accessibilityLabel={t("connections.connected")}
          hitSlop={8}
          className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-coral-50 dark:bg-ink-700"
          onPress={(e) => {
            e.stopPropagation();
            onQuickChat();
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} className="text-coral-500" />
          {unreadCount ? (
            <View className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-coral-500 dark:border-ink-800" />
          ) : null}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function Connections() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: matched, refetch: refetchMatched, isRefetching: isRefetchingMatched } = useNewConnections(userId);
  const { data: connected, refetch: refetchConnected, isRefetching: isRefetchingConnected } = useMessageThreads(userId);
  const [tab, setTab] = useState<Tab>("matched");
  const [gridWidth, setGridWidth] = useState(0);

  // Math.floor matters here: a fractional width (e.g. 157.5) can get rounded UP by
  // the browser's layout engine, making COLUMNS cards + gaps a hair wider than the
  // container -- flex-wrap then bumps the last card onto its own line instead of
  // keeping them side by side, which is exactly the "cards stack vertically on web"
  // bug this fixes.
  const cardWidth = gridWidth > 0 ? Math.floor((gridWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS) : 0;

  function refetch() {
    refetchMatched();
    refetchConnected();
  }

  // replace, not push: "user" is its own hidden tab (see (app)/_layout.tsx), and
  // switching away from a tab doesn't pop its stack, only changes focus -- a push
  // here would leave the previous profile sitting underneath, so back() from a
  // later one would land on it instead of returning to this Connections screen.
  function goToProfile(otherUserId: string, matchId: string) {
    router.replace(`/(app)/user/${otherUserId}?matchId=${matchId}`);
  }

  const people = tab === "matched" ? matched : connected;
  const emptyLabel = tab === "matched" ? t("connections.emptyMatched") : t("connections.emptyConnected");

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950" edges={["left", "right", "bottom"]}>
      <RefreshableScrollView
        refreshing={isRefetchingMatched || isRefetchingConnected}
        onRefresh={refetch}
        className="flex-1 px-6 pt-4"
        contentContainerClassName="gap-6 pb-10"
      >
        <View className="flex-row rounded-full border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-1">
          {(["matched", "connected"] as const).map((value) => {
            const selected = tab === value;
            const count = (value === "matched" ? matched : connected)?.length ?? 0;
            return (
              <Pressable
                key={value}
                className={`flex-1 items-center rounded-full py-2 ${selected ? "bg-coral-500" : ""}`}
                onPress={() => setTab(value)}
              >
                <Text
                  className={`text-sm font-medium ${selected ? "text-white" : "text-ink-700 dark:text-ink-200"}`}
                >
                  {t(`connections.${value}`)}
                  {count > 0 ? ` (${count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
          {!people || people.length === 0 ? (
            <Text className="text-base text-ink-700 dark:text-ink-200">{emptyLabel}</Text>
          ) : cardWidth > 0 ? (
            <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
              {people.map((person) => (
                <PersonCard
                  key={person.matchId}
                  person={person}
                  width={cardWidth}
                  unreadCount={tab === "connected" ? (person as MessageThread).unreadCount : undefined}
                  onPress={() => goToProfile(person.otherUserId, person.matchId)}
                  onQuickChat={tab === "connected" ? () => router.push(`/(app)/chat/${person.matchId}`) : undefined}
                />
              ))}
            </View>
          ) : null}
        </View>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
