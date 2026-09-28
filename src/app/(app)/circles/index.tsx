import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useCircles, useJoinCircle, useMyCircleMemberships } from "@/hooks/useCircles";
import { CIRCLE_TOPIC_BADGE_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";
import { Chip } from "@/components/Chip";

export default function Circles() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: circles } = useCircles();
  const { data: memberships } = useMyCircleMemberships(userId);
  const joinCircle = useJoinCircle(userId);

  const joinedIds = new Set(memberships ?? []);

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-8" contentContainerClassName="gap-4 pb-10">
        <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">{t("circles.title")}</Text>
        <Text className="-mt-2 text-base text-ink-700 dark:text-ink-200">{t("circles.subtitle")}</Text>

        {(circles ?? []).map((circle) => {
          const topic = circle.topic as CircleTopic;
          const isJoined = joinedIds.has(circle.id);
          return (
            <Pressable
              key={circle.id}
              onPress={() => router.push(`/(app)/circles/${circle.id}`)}
              className="flex-row gap-3 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4"
            >
              <View className={`h-12 w-12 items-center justify-center rounded-xl ${CIRCLE_TOPIC_BADGE_COLORS[topic].bg}`}>
                <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={22} color={CIRCLE_TOPIC_BADGE_COLORS[topic].fg} />
              </View>

              <View className="flex-1 gap-1">
                <Text className="font-display text-lg text-ink-900 dark:text-ink-50">{circle.name}</Text>
                <Text className="text-sm text-ink-700 dark:text-ink-200" numberOfLines={2}>
                  {circle.description}
                </Text>
                <Text className="text-xs text-ink-400">
                  {t("circles.membersCount", { count: circle.member_count })}
                  {circle.city ? ` · ${circle.city}` : ""}
                </Text>
              </View>

              <View className="justify-center">
                <Chip
                  label={isJoined ? t("circles.joined") : t("circles.join")}
                  selected={isJoined}
                  disabled={joinCircle.isPending}
                  onPress={() => {
                    if (!isJoined) joinCircle.mutate(circle.id);
                  }}
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
