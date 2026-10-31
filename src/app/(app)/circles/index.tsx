import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import {
  useCircles,
  useJoinCircle,
  useMyCircleMemberships,
  useUpcomingEventCounts,
} from "@/hooks/useCircles";
import { useCanHost } from "@/hooks/useCanHost";
import { useIsNearby, useLocalFilter } from "@/stores/localFilter";
import { ToggleChip } from "@/components/ToggleChip";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";
import { useWideLayout } from "@/hooks/useWideLayout";
import { CirclesDesktop } from "@/components/CirclesDesktop";

// Desktop web gets its own layout (CirclesDesktop): a two-column grid with filter
// chips and an upcoming-events column. This is the phone screen.
export default function Circles() {
  const wide = useWideLayout();
  return wide ? <CirclesDesktop /> : <CirclesPhone />;
}

function CirclesPhone() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: circles, refetch, isRefetching } = useCircles();
  const { data: memberships } = useMyCircleMemberships(userId);
  const { data: eventCounts, refetch: refetchEventCounts } = useUpcomingEventCounts();
  const joinCircle = useJoinCircle(userId);
  const { canHost } = useCanHost(userId);
  const localEnabled = useLocalFilter((s) => s.enabled);
  const localStatus = useLocalFilter((s) => s.status);
  const setLocalEnabled = useLocalFilter((s) => s.setEnabled);
  const isNearby = useIsNearby();
  const nearMeOn = localEnabled || localStatus === "locating";

  const joinedIds = new Set(memberships ?? []);

  const shownCircles = (circles ?? []).filter(isNearby);

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <RefreshableScrollView
        refreshing={isRefetching}
        onRefresh={() => {
          refetch();
          refetchEventCounts();
        }}
        className="flex-1 px-6 pt-4"
        contentContainerClassName="gap-4 pb-10"
      >
        {/* The intro with the Near me filter beside it, as on desktop. */}
        <View className="flex-row items-start gap-3">
          <Text className="flex-1 text-base text-ink-700 dark:text-ink-200">{t("circles.subtitle")}</Text>
          <ToggleChip
            label={t("circles.nearMe")}
            on={nearMeOn}
            onPress={() => setLocalEnabled(!nearMeOn)}
            accessibilityHint={t("circles.localHint")}
          />
        </View>

        {/* Plus with a verified ID, admins included (migration 0035); nobody else sees it. */}
        {canHost ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(app)/circles/new", { withAnchor: true })}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary-500 px-4 py-3"
          >
            <Ionicons name="add" size={20} color="#127A87" />
            <Text className="text-base font-medium text-primary-600">{t("circles.newCircle")}</Text>
          </Pressable>
        ) : null}

        {localStatus === "denied" || localStatus === "unavailable" ? (
          <Text className="-mt-2 text-xs text-accent-600">
            {localStatus === "denied" ? t("circles.locationDenied") : t("circles.locationUnavailable")}
          </Text>
        ) : null}

        {localEnabled && circles && shownCircles.length === 0 ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("circles.noLocalCircles")}</Text>
        ) : null}

        {shownCircles.map((circle) => {
          const topic = circle.topic as CircleTopic;
          const isJoined = joinedIds.has(circle.id);
          return (
            <Pressable
              key={circle.id}
              onPress={() => router.push(`/(app)/circles/${circle.id}`, { withAnchor: true })}
              className="flex-row gap-3 rounded-[18px] bg-white p-4 dark:bg-ink-800"
            >
              <View className={`h-12 w-12 items-center justify-center rounded-[14px] ${CIRCLE_TOPIC_COLORS[topic].bg}`}>
                <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={22} color={CIRCLE_TOPIC_COLORS[topic].fg} />
              </View>

              <View className="flex-1 gap-1">
                <Text className="font-display text-lg text-ink-900 dark:text-ink-50" numberOfLines={1}>
                  {circle.name}
                </Text>
                {circle.description ? (
                  <Text className="text-sm text-ink-700 dark:text-ink-200" numberOfLines={2}>
                    {circle.description}
                  </Text>
                ) : null}
                <Text className="text-xs text-ink-400 dark:text-ink-300" numberOfLines={1}>
                  {[
                    t("circles.membersCount", { count: circle.member_count }),
                    t("circles.upcomingEventsCount", { count: eventCounts?.[circle.id] ?? 0 }),
                    [circle.city, circle.state].filter(Boolean).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>

              {/* Only circles you're not in get a button, as on desktop. */}
              {isJoined ? null : (
                <View className="justify-center">
                  <Pressable
                    accessibilityRole="button"
                    disabled={joinCircle.isPending}
                    onPress={(e) => {
                      // Don't also open the circle underneath.
                      e.stopPropagation();
                      joinCircle.mutate(circle.id);
                    }}
                    className="h-9 justify-center rounded-full bg-primary-500 px-4"
                  >
                    <Text className="text-sm font-semibold text-white">{t("circles.join")}</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        })}
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
