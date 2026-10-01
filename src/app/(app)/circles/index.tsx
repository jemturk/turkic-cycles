import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useCircles, useJoinCircle, useMyCircleMemberships } from "@/hooks/useCircles";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";
import { Chip } from "@/components/Chip";
import { RefreshableScrollView } from "@/components/RefreshableScrollView";

export default function Circles() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: circles, refetch, isRefetching } = useCircles();
  const { data: memberships } = useMyCircleMemberships(userId);
  const joinCircle = useJoinCircle(userId);
  const [query, setQuery] = useState("");

  const joinedIds = new Set(memberships ?? []);

  // Client-side filter: circles are a small, fully-fetched list (useCircles has no
  // pagination), so there's no need for a server-side search query here.
  const filteredCircles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return circles ?? [];
    return (circles ?? []).filter((circle) =>
      [circle.name, circle.description, circle.city].some((field) => field?.toLowerCase().includes(needle))
    );
  }, [circles, query]);

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <RefreshableScrollView
        refreshing={isRefetching}
        onRefresh={refetch}
        className="flex-1 px-6 pt-8"
        contentContainerClassName="gap-4 pb-10"
      >
        <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">{t("circles.title")}</Text>
        <Text className="-mt-2 text-base text-ink-700 dark:text-ink-200">{t("circles.subtitle")}</Text>

        <View className="flex-row items-center gap-2 rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
          <Ionicons name="search" size={18} color="#8A7C76" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("circles.searchPlaceholder")}
            placeholderTextColor="#8A7C76"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="flex-1 text-base text-ink-900 dark:text-ink-50"
          />
          {query ? (
            <Pressable accessibilityLabel={t("common.clear")} hitSlop={8} onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#8A7C76" />
            </Pressable>
          ) : null}
        </View>

        {query && filteredCircles.length === 0 ? (
          <Text className="text-center text-sm text-ink-400">{t("circles.noResults", { query })}</Text>
        ) : null}

        {filteredCircles.map((circle) => {
          const topic = circle.topic as CircleTopic;
          const isJoined = joinedIds.has(circle.id);
          return (
            <Pressable
              key={circle.id}
              onPress={() => router.push(`/(app)/circles/${circle.id}`)}
              className="flex-row gap-3 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4"
            >
              <View className={`h-12 w-12 items-center justify-center rounded-xl ${CIRCLE_TOPIC_COLORS[topic].bg}`}>
                <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={22} color={CIRCLE_TOPIC_COLORS[topic].fg} />
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
      </RefreshableScrollView>
    </SafeAreaView>
  );
}
