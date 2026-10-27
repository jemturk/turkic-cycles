import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useCircle, useCircleMembers } from "@/hooks/useCircles";
import { Avatar } from "@/components/Avatar";
import { CircleHeader } from "@/components/CircleHeader";
import type { CircleTopic } from "@/constants/circles";
import { useWideLayout } from "@/hooks/useWideLayout";

// Everyone in a circle: under the circle's own header, a white card of photos in
// even columns (three on phones, five on desktop) with each member's city under
// their name, and Meet members pinned at the bottom.
export default function CircleMembers() {
  const { t } = useTranslation();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const navigation = useRouter();
  const insets = useSafeAreaInsets();
  const wide = useWideLayout();
  const { data: circle } = useCircle(circleId);
  const { data: members } = useCircleMembers(circleId);

  // Reachable via a direct URL/refresh on web, which has no in-app history to pop.
  function goBack() {
    if (navigation.canGoBack()) router.back();
    else router.replace(`/(app)/circles/${circleId}`, { withAnchor: true });
  }

  if (!circle) return null;

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950" edges={["left", "right"]}>
      <CircleHeader
        name={circle.name}
        topic={circle.topic as CircleTopic}
        onBack={goBack}
        subtitle={[
          t("circles.membersCount", { count: circle.member_count }),
          [circle.city, circle.state].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName={wide ? "items-center px-8 pb-28 pt-6" : "px-4 pb-28 pt-4"}
      >
        <View
          className={`flex-row flex-wrap rounded-2xl bg-white px-2 py-4 dark:bg-ink-800 ${wide ? "w-full max-w-[760px]" : ""}`}
        >
          {(members ?? []).map((member) => (
            <Pressable
              key={member.userId}
              className="items-center gap-1 rounded-xl px-1 py-2 web:hover:bg-primary-100/40 dark:web:hover:bg-ink-700"
              style={{ width: wide ? "20%" : "33.333%" }}
              onPress={() => router.replace(`/(app)/user/${member.userId}`)}
            >
              <Avatar uri={member.avatarUrl} name={member.displayName} size={64} />
              <Text className="mt-0.5 text-sm text-ink-900 dark:text-ink-50" numberOfLines={1}>
                {member.displayName || t("common.member")}
              </Text>
              {member.city ? (
                <Text className="-mt-1 text-xs text-ink-400 dark:text-ink-300" numberOfLines={1}>
                  {member.city}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        className={`absolute inset-x-0 bottom-0 px-4 ${wide ? "items-center" : ""}`}
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/(app)/circles/${circle.id}/discover`, { withAnchor: true })}
          className={`h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-500 web:hover:bg-primary-600 ${
            wide ? "w-full max-w-[760px]" : ""
          }`}
          style={{
            shadowColor: "#127A87",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
          <Text className="font-semibold text-white">{t("circles.meetMembers")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
