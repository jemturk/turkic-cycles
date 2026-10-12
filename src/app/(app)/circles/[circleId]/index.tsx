import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { useCircle, useCircleEvents, useMyCircleRole } from "@/hooks/useCircles";
import { useCanHost } from "@/hooks/useCanHost";
import { useSession } from "@/hooks/useSession";
import { type CircleTopic } from "@/constants/circles";
import { CircleHeader } from "@/components/CircleHeader";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";

type Tab = "upcoming" | "past";

export default function CircleEvents() {
  const { t } = useTranslation();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const navigation = useRouter();
  const { data: circle } = useCircle(circleId);
  const { data: events, refetch, isRefetching } = useCircleEvents(circleId);
  const [tab, setTab] = useState<Tab>("upcoming");
  const { session } = useSession();
  const { data: role } = useMyCircleRole(circleId, session?.user.id);
  const { canHost } = useCanHost(session?.user.id);
  // Same rule the database enforces for creating events (migration 0035).
  const canAddEvent = canHost && (role === "owner" || role === "moderator");

  // Reachable via a direct URL/refresh on web, which has no in-app history to pop.
  function goBack() {
    if (navigation.canGoBack()) router.back();
    else router.replace("/(app)/circles");
  }

  if (!circle) return null;

  const shown = events?.[tab] ?? [];

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <CircleHeader name={circle.name} topic={circle.topic as CircleTopic} onBack={goBack} />

      <RefreshableScrollView
        refreshing={isRefetching}
        onRefresh={refetch}
        className="flex-1 px-6 pt-4"
        contentContainerClassName="gap-4 pb-10"
      >
        {canAddEvent ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(app)/circles/${circleId}/events/new`)}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary-500 px-4 py-3"
          >
            <Ionicons name="add" size={20} color="#127A87" />
            <Text className="text-base font-medium text-primary-600">{t("circles.addEvent")}</Text>
          </Pressable>
        ) : null}

        {/* Same segmented control as the Connections tab. */}
        <View className="flex-row rounded-full border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-1">
          {(["upcoming", "past"] as const).map((value) => {
            const selected = tab === value;
            const count = events?.[value].length ?? 0;
            return (
              <Pressable
                key={value}
                className={`flex-1 items-center rounded-full py-2 ${selected ? "bg-primary-500" : ""}`}
                onPress={() => setTab(value)}
              >
                <Text className={`text-sm font-medium ${selected ? "text-white" : "text-ink-700 dark:text-ink-200"}`}>
                  {t(`circles.${value}`)}
                  {count > 0 ? ` (${count})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {events && shown.length === 0 ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">
            {tab === "upcoming" ? t("circles.noUpcomingEvents") : t("circles.noPastEvents")}
          </Text>
        ) : null}

        {shown.map((event) => (
          <Pressable
            key={event.id}
            onPress={() => router.push(`/(app)/circles/${circleId}/events/${event.id}`)}
            className="flex-row items-center gap-3 rounded-2xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4"
          >
            <View className="flex-1 gap-1">
              <Text className="font-display text-lg text-ink-900 dark:text-ink-50">{event.title}</Text>
              <Text className="text-sm text-ink-700 dark:text-ink-200">
                {format(new Date(event.starts_at), "EEE, MMM d · h:mm a")}
              </Text>
              {event.location ? (
                <Text className="text-sm text-ink-400" numberOfLines={1}>
                  {event.location}
                </Text>
              ) : null}
              {event.going_count > 0 || event.interested_count > 0 ? (
                <Text className="text-xs font-medium text-primary-600">
                  {[
                    event.going_count > 0 ? t("circles.goingCount", { count: event.going_count }) : null,
                    event.interested_count > 0 ? t("circles.interestedCount", { count: event.interested_count }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8A7C76" />
          </Pressable>
        ))}
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
