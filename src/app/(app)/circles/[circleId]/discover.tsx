import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { DiscoverDeck } from "@/components/DiscoverDeck";
import { DiscoverFiltersButton } from "@/components/DiscoverFilters";
import { CircleHeader, CirclePageSkeleton } from "@/components/CircleHeader";
import { useCircle } from "@/hooks/useCircles";
import { useWideLayout } from "@/hooks/useWideLayout";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";
import { goUp } from "@/lib/goUp";

// A circle's Meet members: its Discover deck, under the circle's own header (name and
// topic colour, so it's clear whose members these are) rather than a bare "Discover".
export default function Discover() {
  const { t } = useTranslation();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const { data: circle, isLoading } = useCircle(circleId);
  const wide = useWideLayout();
  const filtersHref = `/(app)/circles/${circleId}/filters` as const;

  function goBack() {
    goUp(`/(app)/circles/${circleId}`);
  }

  if (!circle) return isLoading ? <CirclePageSkeleton onBack={goBack} wide={wide} /> : null;
  const topic = circle.topic as CircleTopic;

  const deck = (
    <DiscoverDeck
      circleId={circleId}
      emptyLabel={t("discover.empty")}
      filtersHref={filtersHref}
      onOpenProfile={(userId) => router.replace(`/(app)/user/${userId}?circleId=${circleId}&fromDiscover=true`)}
    />
  );

  // Desktop web: a large title row like the circle's page, over the card grid.
  if (wide) {
    return (
      <View className="flex-1 gap-5 bg-primary-50 px-20 pt-9 dark:bg-ink-950">
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
              {t("circles.meetMembers")}
            </Text>
            <Text className="text-sm text-ink-400 dark:text-ink-300">{circle.name}</Text>
          </View>
          <DiscoverFiltersButton filtersHref={filtersHref} />
        </View>
        {deck}
      </View>
    );
  }

  return (
    // As on the Discover tab: no bottom edge (the tab bar covers the phone's inset) and
    // 16 under the buttons, so they sit clear of the tab bar's rounded top.
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <CircleHeader
        name={circle.name}
        topic={topic}
        onBack={goBack}
        subtitle={t("circles.meetMembers")}
        right={<DiscoverFiltersButton filtersHref={filtersHref} iconColor="#2B2320" />}
      />
      <View className="flex-1 px-4 pb-4">{deck}</View>
    </SafeAreaView>
  );
}
