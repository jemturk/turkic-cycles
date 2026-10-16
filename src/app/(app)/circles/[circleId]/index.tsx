import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import {
  useCircle,
  useCircleEvents,
  useLeaveCircle,
  useMyCircleMemberships,
  useMyCircleRole,
} from "@/hooks/useCircles";
import { CircleMenu } from "@/components/CircleMenu";
import { useCanHost } from "@/hooks/useCanHost";
import { useSession } from "@/hooks/useSession";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";
import { CircleHeader } from "@/components/CircleHeader";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";
import { useWideLayout } from "@/hooks/useWideLayout";

type Tab = "upcoming" | "past";

// Desktop web: event cards at least this wide, at most three to a row.
const WIDE_GAP = 16;
const WIDE_MIN_CARD_WIDTH = 300;
const WIDE_MAX_COLUMNS = 3;

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
  const { data: memberships } = useMyCircleMemberships(session?.user.id);
  const leaveCircle = useLeaveCircle(session?.user.id);
  const isJoined = (memberships ?? []).includes(circleId);
  // Leave circle, behind a confirmation -- only for circles you're in.
  const menu =
    isJoined && circle ? (
      <CircleMenu
        circleName={circle.name}
        leaving={leaveCircle.isPending}
        onLeave={() => leaveCircle.mutate(circleId)}
      />
    ) : null;
  // Same rule the database enforces for creating events (migration 0035).
  const canAddEvent = canHost && (role === "owner" || role === "moderator");
  const wide = useWideLayout();
  const [gridWidth, setGridWidth] = useState(0);

  // Reachable via a direct URL/refresh on web, which has no in-app history to pop.
  function goBack() {
    if (navigation.canGoBack()) router.back();
    else router.replace("/(app)/circles");
  }

  if (!circle) return null;

  const shown = events?.[tab] ?? [];
  const topic = circle.topic as CircleTopic;

  function goingLine(event: (typeof shown)[number]) {
    return [
      event.going_count > 0 ? t("circles.goingCount", { count: event.going_count }) : null,
      event.interested_count > 0 ? t("circles.interestedCount", { count: event.interested_count }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  // Desktop web: a large title row (back, the topic icon, name, details, Add event),
  // Upcoming / Past as chips, and the events as a grid of cards whose date tiles
  // wear the circle's topic colors, as in the Circles screen's events column.
  if (wide) {
    const columns = Math.min(
      WIDE_MAX_COLUMNS,
      Math.max(1, Math.floor((gridWidth + WIDE_GAP) / (WIDE_MIN_CARD_WIDTH + WIDE_GAP))),
    );
    const cardWidth = gridWidth > 0 ? Math.floor((gridWidth - WIDE_GAP * (columns - 1)) / columns) : 0;
    const place = [circle.city, circle.state].filter(Boolean).join(", ");
    return (
      <ScrollView
        className="flex-1 bg-primary-50 dark:bg-ink-950"
        contentContainerClassName="gap-5 px-20 pb-10 pt-9"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityLabel={t("common.back")}
            hitSlop={8}
            onPress={goBack}
            className="h-10 w-10 items-center justify-center rounded-full web:hover:bg-white dark:web:hover:bg-ink-800"
          >
            <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
          </Pressable>
          <View className={`h-14 w-14 items-center justify-center rounded-2xl ${CIRCLE_TOPIC_COLORS[topic].bg}`}>
            <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={26} color={CIRCLE_TOPIC_COLORS[topic].fg} />
          </View>
          <View className="flex-1 gap-1">
            <Text className="font-display text-4xl text-ink-900 dark:text-ink-50" numberOfLines={1}>
              {circle.name}
            </Text>
            <Text className="text-sm text-ink-400">
              {[t("circles.membersCount", { count: circle.member_count }), place].filter(Boolean).join(" · ")}
            </Text>
          </View>
          {canAddEvent ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/(app)/circles/${circleId}/events/new`)}
              className="h-11 flex-row items-center justify-center gap-1.5 rounded-full bg-primary-500 px-5 web:hover:bg-primary-600"
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text className="text-[15px] font-semibold text-white">{t("circles.addEvent")}</Text>
            </Pressable>
          ) : null}
          {menu}
        </View>

        {circle.description ? (
          <Text className="max-w-[760px] text-base text-ink-700 dark:text-ink-200">{circle.description}</Text>
        ) : null}

        <View className="flex-row gap-2">
          {(["upcoming", "past"] as const).map((value) => {
            const selected = tab === value;
            const count = events?.[value].length ?? 0;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                aria-pressed={selected}
                onPress={() => setTab(value)}
                className={`h-9 flex-row items-center gap-2 rounded-full px-4 ${
                  selected ? "bg-primary-500" : "border border-primary-100 bg-white dark:border-ink-700 dark:bg-ink-800"
                }`}
              >
                <Text className={`text-sm ${selected ? "font-semibold text-white" : "text-ink-900 dark:text-ink-50"}`}>
                  {t(`circles.${value}`)}
                </Text>
                {count > 0 ? (
                  <Text className={`text-xs ${selected ? "text-white/85" : "text-ink-400"}`}>{count}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {events && shown.length === 0 ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">
            {tab === "upcoming" ? t("circles.noUpcomingEvents") : t("circles.noPastEvents")}
          </Text>
        ) : null}

        <View
          onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: "row", flexWrap: "wrap", gap: WIDE_GAP }}
        >
          {cardWidth > 0
            ? shown.map((event) => {
                const startsAt = new Date(event.starts_at);
                const going = goingLine(event);
                return (
                  <Pressable
                    key={event.id}
                    onPress={() => router.push(`/(app)/circles/${circleId}/events/${event.id}`)}
                    style={{ width: cardWidth }}
                    className="flex-row gap-4 rounded-[18px] bg-white p-5 web:hover:shadow-md dark:bg-ink-800"
                  >
                    <View
                      className={`h-16 w-[60px] items-center justify-center rounded-xl ${CIRCLE_TOPIC_COLORS[topic].bg}`}
                    >
                      <Text
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: CIRCLE_TOPIC_COLORS[topic].fg }}
                      >
                        {format(startsAt, "MMM")}
                      </Text>
                      <Text className="text-2xl font-bold" style={{ color: CIRCLE_TOPIC_COLORS[topic].fg }}>
                        {format(startsAt, "d")}
                      </Text>
                    </View>
                    <View className="flex-1 gap-1">
                      <Text className="font-display text-lg text-ink-900 dark:text-ink-50" numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text className="text-sm text-ink-700 dark:text-ink-200">{format(startsAt, "EEE · h:mm a")}</Text>
                      {event.location ? (
                        <Text className="text-sm text-ink-400" numberOfLines={1}>
                          {event.location}
                        </Text>
                      ) : null}
                      {going ? <Text className="text-xs font-medium text-primary-600">{going}</Text> : null}
                    </View>
                  </Pressable>
                );
              })
            : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <CircleHeader name={circle.name} topic={topic} onBack={goBack} />

      <RefreshableScrollView
        refreshing={isRefetching}
        onRefresh={refetch}
        className="flex-1 px-6 pt-4"
        contentContainerClassName="gap-4 pb-10"
      >
        <View className="z-10 flex-row items-center gap-3">
          <Text className="flex-1 text-sm text-ink-400" numberOfLines={1}>
            {[
              t("circles.membersCount", { count: circle.member_count }),
              [circle.city, circle.state].filter(Boolean).join(", "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {menu}
        </View>

        {circle.description ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{circle.description}</Text>
        ) : null}

        {canAddEvent ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(app)/circles/${circleId}/events/new`)}
            className="h-11 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary-500"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-[15px] font-semibold text-white">{t("circles.addEvent")}</Text>
          </Pressable>
        ) : null}

        {/* Upcoming / Past as chips, as on desktop. */}
        <View className="flex-row gap-2">
          {(["upcoming", "past"] as const).map((value) => {
            const selected = tab === value;
            const count = events?.[value].length ?? 0;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                aria-pressed={selected}
                onPress={() => setTab(value)}
                className={`h-9 flex-row items-center gap-2 rounded-full px-4 ${
                  selected ? "bg-primary-500" : "border border-primary-100 bg-white dark:border-ink-700 dark:bg-ink-800"
                }`}
              >
                <Text className={`text-sm ${selected ? "font-semibold text-white" : "text-ink-900 dark:text-ink-50"}`}>
                  {t(`circles.${value}`)}
                </Text>
                {count > 0 ? (
                  <Text className={`text-xs ${selected ? "text-white/85" : "text-ink-400"}`}>{count}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {events && shown.length === 0 ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">
            {tab === "upcoming" ? t("circles.noUpcomingEvents") : t("circles.noPastEvents")}
          </Text>
        ) : null}

        {/* Event cards with a date tile in the circle's topic colors, as on desktop. */}
        {shown.map((event) => {
          const startsAt = new Date(event.starts_at);
          const going = goingLine(event);
          const colors = CIRCLE_TOPIC_COLORS[topic];
          return (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/(app)/circles/${circleId}/events/${event.id}`)}
              className="flex-row items-center gap-4 rounded-[18px] bg-white p-4 dark:bg-ink-800"
            >
              <View className={`h-[60px] w-14 items-center justify-center rounded-xl ${colors.bg}`}>
                <Text className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.fg }}>
                  {format(startsAt, "MMM")}
                </Text>
                <Text className="text-2xl font-bold" style={{ color: colors.fg }}>
                  {format(startsAt, "d")}
                </Text>
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-display text-lg text-ink-900 dark:text-ink-50" numberOfLines={1}>
                  {event.title}
                </Text>
                <Text className="text-sm text-ink-700 dark:text-ink-200">{format(startsAt, "EEE · h:mm a")}</Text>
                {event.location ? (
                  <Text className="text-sm text-ink-400" numberOfLines={1}>
                    {event.location}
                  </Text>
                ) : null}
                {going ? <Text className="text-xs font-medium text-primary-600">{going}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A99C95" />
            </Pressable>
          );
        })}
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
