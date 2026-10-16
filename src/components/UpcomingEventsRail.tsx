import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { useUpcomingEventsInCircles } from "@/hooks/useCircles";

// Alternates the date tile between the app's two logo colors.
const TILE_COLORS = ["bg-primary-500", "bg-accent-500"];

// Desktop web's Circles screen (CirclesDesktop): the next few events across the
// circles you've joined, down the right. circleNames maps circle id -> name (from
// the circles list already loaded there) for the line under each title.
export function UpcomingEventsRail({
  joinedCircleIds,
  circleNames,
}: {
  joinedCircleIds: string[] | undefined;
  circleNames: Map<string, string>;
}) {
  const { t } = useTranslation();
  const { data: events } = useUpcomingEventsInCircles(joinedCircleIds);

  return (
    <View className="w-[340px] gap-3.5 pr-7 pt-12">
      <Text className="px-3 font-display text-[22px] text-ink-900 dark:text-ink-50">{t("circles.upcomingEvents")}</Text>
      {/* px/pt leave room for the cards' hover shadow, which the ScrollView would clip. */}
      <ScrollView contentContainerClassName="gap-3.5 px-3 pb-10 pt-1" showsVerticalScrollIndicator={false}>
        {events && events.length === 0 ? (
          <Text className="text-sm text-ink-700 dark:text-ink-200">{t("circles.noUpcomingEvents")}</Text>
        ) : null}
        {(events ?? []).map((event, index) => {
          const startsAt = new Date(event.starts_at);
          return (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/(app)/circles/${event.circle_id}/events/${event.id}`)}
              className="flex-row items-center gap-3.5 rounded-[18px] bg-white p-[18px] web:hover:shadow-md dark:bg-ink-800"
            >
              <View
                className={`h-14 w-[52px] items-center justify-center rounded-xl ${TILE_COLORS[index % TILE_COLORS.length]}`}
              >
                <Text className="text-[11px] font-bold uppercase tracking-wider text-white">{format(startsAt, "MMM")}</Text>
                <Text className="text-xl font-bold text-white">{format(startsAt, "d")}</Text>
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="font-semibold text-ink-900 dark:text-ink-50" numberOfLines={2}>
                  {event.title}
                </Text>
                <Text className="text-[13px] text-ink-700 dark:text-ink-200" numberOfLines={1}>
                  {circleNames.get(event.circle_id)}
                </Text>
                <Text className="text-xs text-ink-400">{format(startsAt, "EEE h:mm a")}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
