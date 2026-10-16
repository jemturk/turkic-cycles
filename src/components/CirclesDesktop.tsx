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

const GAP = 16;
// Cards at least this wide, at most MAX_COLUMNS of them.
const MIN_CARD_WIDTH = 320;
const MAX_COLUMNS = 3;

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
// a large title with search and New circle beside it, filter chips, a grid of
// same-sized circle cards, and the next events in your circles down the right.
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
  const [gridWidth, setGridWidth] = useState(0);

  const joinedIds = new Set(memberships ?? []);
  const shownCircles = (circles ?? []).filter(isNearby).filter((c) => !joinedOnly || joinedIds.has(c.id));
  const nearMeOn = localEnabled || localStatus === "locating";

  const columns = Math.min(MAX_COLUMNS, Math.max(1, Math.floor((gridWidth + GAP) / (MIN_CARD_WIDTH + GAP))));
  const cardWidth = gridWidth > 0 ? Math.floor((gridWidth - GAP * (columns - 1)) / columns) : 0;

  // Every card has the same shape -- icon, a one-line title, room for exactly two
  // lines of description, the details -- so the grid lines up row after row.
  function renderCircle(circle: Circle) {
    const topic = circle.topic as CircleTopic;
    const isJoined = joinedIds.has(circle.id);
    const place = [circle.city, circle.state].filter(Boolean).join(", ");
    return (
      <Pressable
        key={circle.id}
        onPress={() => router.push(`/(app)/circles/${circle.id}`)}
        style={{ width: cardWidth }}
        className="gap-3 rounded-[18px] bg-white p-5 web:hover:shadow-md dark:bg-ink-800"
      >
        <View className="flex-row items-start justify-between">
          <View className={`h-11 w-11 items-center justify-center rounded-[14px] ${CIRCLE_TOPIC_COLORS[topic].bg}`}>
            <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={20} color={CIRCLE_TOPIC_COLORS[topic].fg} />
          </View>
          {/* Only circles you're not in get a button; "Joined" filters to yours. */}
          {isJoined ? null : (
            <Pressable
              accessibilityRole="button"
              disabled={joinCircle.isPending}
              onPress={(e) => {
                // Don't also open the circle underneath.
                e.stopPropagation();
                joinCircle.mutate(circle.id);
              }}
              className="h-9 justify-center rounded-full bg-primary-500 px-4 web:hover:bg-primary-600"
            >
              <Text className="text-sm font-semibold text-white">{t("circles.join")}</Text>
            </Pressable>
          )}
        </View>

        <View className="gap-1.5">
          <Text className="font-display text-xl text-ink-900 dark:text-ink-50" numberOfLines={1}>
            {circle.name}
          </Text>
          {/* An invisible two-line placeholder sets the height, so a one-line (or
              missing) description leaves the card as tall as the others at any text
              size; the real text sits over it. */}
          <View>
            <Text aria-hidden className="text-base leading-snug opacity-0">
              {"\u00A0\n\u00A0"}
            </Text>
            <Text
              className="absolute inset-x-0 top-0 text-base leading-snug text-ink-700 dark:text-ink-200"
              numberOfLines={2}
            >
              {circle.description}
            </Text>
          </View>
        </View>

        <Text className="text-[13px] text-ink-400" numberOfLines={1}>
          {[
            t("circles.membersCount", { count: circle.member_count }),
            t("circles.upcomingEventsCount", { count: eventCounts?.[circle.id] ?? 0 }),
            place,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-1 flex-row gap-14 bg-primary-50 dark:bg-ink-950">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-10 pl-20 pr-3 pt-9"
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

        <View
          onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}
        >
          {cardWidth > 0 ? shownCircles.map(renderCircle) : null}
        </View>
      </ScrollView>

      <UpcomingEventsRail
        joinedCircleIds={memberships}
        circleInfo={new Map((circles ?? []).map((c) => [c.id, { name: c.name, topic: c.topic }]))}
      />
    </View>
  );
}
