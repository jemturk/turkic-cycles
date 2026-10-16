import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { useSession } from "@/hooks/useSession";
import {
  useCircles,
  useJoinCircle,
  useMyCircleMemberships,
  useUpcomingEventCounts,
} from "@/hooks/useCircles";
import { useCanHost } from "@/hooks/useCanHost";
import { useIsNearby, useLocalFilter } from "@/stores/localFilter";
import { useSearchOverlay } from "@/stores/searchOverlay";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";
import { UpcomingEventsRail } from "@/components/UpcomingEventsRail";

type Circle = NonNullable<ReturnType<typeof useCircles>["data"]>[number];

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-pressed={selected}
      onPress={onPress}
      className={`h-9 justify-center rounded-full px-4 ${
        selected ? "bg-primary-500" : "border border-primary-100 bg-white dark:border-ink-700 dark:bg-ink-800"
      }`}
    >
      <Text className={`text-sm ${selected ? "font-semibold text-white" : "text-ink-900 dark:text-ink-50"}`}>{label}</Text>
    </Pressable>
  );
}

// The Circles tab on desktop web (circles/index.tsx picks it on a wide window):
// a large title with search and New circle beside it, filter chips, the circles in
// two columns, and the next events in your circles down the right.
export function CirclesDesktop() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: circles } = useCircles();
  const { data: memberships } = useMyCircleMemberships(userId);
  const { data: eventCounts } = useUpcomingEventCounts();
  const joinCircle = useJoinCircle(userId);
  const { canHost } = useCanHost(userId);
  const localEnabled = useLocalFilter((s) => s.enabled);
  const localStatus = useLocalFilter((s) => s.status);
  const setLocalEnabled = useLocalFilter((s) => s.setEnabled);
  const isNearby = useIsNearby();
  const openSearch = useSearchOverlay((s) => s.setOpen);
  const [joinedOnly, setJoinedOnly] = useState(false);

  const joinedIds = new Set(memberships ?? []);
  const shownCircles = (circles ?? []).filter(isNearby).filter((c) => !joinedOnly || joinedIds.has(c.id));
  const nearMeOn = localEnabled || localStatus === "locating";

  function renderCircle(circle: Circle) {
    const topic = circle.topic as CircleTopic;
    const isJoined = joinedIds.has(circle.id);
    const place = [circle.city, circle.state].filter(Boolean).join(", ");
    return (
      <Pressable
        onPress={() => router.push(`/(app)/circles/${circle.id}`)}
        className="flex-1 flex-row gap-3.5 rounded-[18px] bg-white p-5 web:hover:shadow-md dark:bg-ink-800"
      >
        <View className={`h-12 w-12 items-center justify-center rounded-[14px] ${CIRCLE_TOPIC_COLORS[topic].bg}`}>
          <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={22} color={CIRCLE_TOPIC_COLORS[topic].fg} />
        </View>

        <View className="flex-1 gap-1.5">
          <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{circle.name}</Text>
          {circle.description ? (
            <Text className="text-base leading-snug text-ink-700 dark:text-ink-200" numberOfLines={2}>
              {circle.description}
            </Text>
          ) : null}
          <Text className="text-[13px] text-ink-400" numberOfLines={1}>
            {[
              t("circles.membersCount", { count: circle.member_count }),
              t("circles.upcomingEventsCount", { count: eventCounts?.[circle.id] ?? 0 }),
              place,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>

        {/* Joined circles just carry a quiet check; the button is only for joining. */}
        {isJoined ? (
          <View accessibilityLabel={t("circles.joined")} className="pt-1">
            <Ionicons name="checkmark-circle" size={22} color="#127A87" />
          </View>
        ) : (
          <View className="justify-center">
            <Pressable
              accessibilityRole="button"
              disabled={joinCircle.isPending}
              onPress={() => joinCircle.mutate(circle.id)}
              className="h-9 justify-center rounded-full bg-primary-500 px-4"
            >
              <Text className="text-sm font-semibold text-white">{t("circles.join")}</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View className="flex-1 flex-row gap-5 bg-primary-50 dark:bg-ink-950">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-10 pl-10 pr-3 pt-9"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap items-center gap-4">
          <Text className="flex-1 font-display text-4xl text-ink-900 dark:text-ink-50">{t("tabs.circles")}</Text>
          <Pressable
            accessibilityRole="search"
            onPress={() => openSearch(true)}
            className="h-11 w-[320px] flex-row items-center gap-2 rounded-full bg-white px-4 dark:bg-ink-800"
          >
            <Ionicons name="search-outline" size={18} color="#8A7C76" />
            <Text className="text-[15px] text-ink-400">{t("tabs.search")}</Text>
          </Pressable>
          {/* Plus with a verified ID, admins included (migration 0035); nobody else sees it. */}
          {canHost ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(app)/circles/new")}
              className="h-11 justify-center rounded-full bg-primary-500 px-5"
            >
              <Text className="text-[15px] font-semibold text-white">{t("circles.newCircle")}</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-2">
          <FilterChip label={t("circles.filterAll")} selected={!joinedOnly} onPress={() => setJoinedOnly(false)} />
          <FilterChip label={t("circles.filterJoined")} selected={joinedOnly} onPress={() => setJoinedOnly(true)} />
          <FilterChip label={t("circles.nearMe")} selected={nearMeOn} onPress={() => setLocalEnabled(!nearMeOn)} />
        </View>
        {localStatus === "denied" || localStatus === "unavailable" ? (
          <Text className="-mt-2 text-xs text-accent-600">
            {localStatus === "denied" ? t("circles.locationDenied") : t("circles.locationUnavailable")}
          </Text>
        ) : null}

        {circles && shownCircles.length === 0 ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">
            {joinedOnly ? t("circles.noJoinedCircles") : localEnabled ? t("circles.noLocalCircles") : null}
          </Text>
        ) : null}

        {/* Rows of pairs, so both cards in a row share its height (an odd last card
            keeps half the width, beside a spacer). */}
        {pairs(shownCircles).map((pair) => (
          <View key={pair[0].id} className="flex-row gap-4">
            {pair.map((circle) => (
              <View key={circle.id} className="flex-1">
                {renderCircle(circle)}
              </View>
            ))}
            {pair.length === 1 ? <View className="flex-1" /> : null}
          </View>
        ))}
      </ScrollView>

      <UpcomingEventsRail
        joinedCircleIds={memberships}
        circleNames={new Map((circles ?? []).map((c) => [c.id, c.name]))}
      />
    </View>
  );
}

function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}
