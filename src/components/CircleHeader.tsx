import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { AppHeader, HEADER_ICON_HEIGHT } from "@/components/AppHeader";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";
import { Bone, RowsSkeleton, SkeletonPulse } from "@/components/Skeleton";

// AppHeader in the circle's topic color, with a back button, topic badge and the
// circle's name in place of the logo. The topic colors are light in both themes,
// so the text and icons stay dark rather than following dark mode.
export function CircleHeader({
  name,
  topic,
  onBack,
  right,
  subtitle,
  onPressSubtitle,
}: {
  name: string;
  topic: CircleTopic;
  onBack: () => void;
  /** In place of search and your avatar -- the circle page's ⋯ menu. */
  right?: ReactNode;
  /** A line under the name -- the circle page's "16 members · Tampa, FL". */
  subtitle?: string;
  /** Makes the name and subtitle a button, the subtitle a pill with a › -- the circle
   *  page's way to its members. */
  onPressSubtitle?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AppHeader
      bgClassName={CIRCLE_TOPIC_COLORS[topic].bg}
      iconColor="#2B2320"
      right={right}
      left={
        <View className="flex-1 flex-row items-center gap-2">
          <Pressable accessibilityLabel={t("common.back")} hitSlop={8} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color="#2B2320" />
          </Pressable>
          <View
            className="items-center justify-center rounded-lg bg-white/70"
            style={{ width: HEADER_ICON_HEIGHT, height: HEADER_ICON_HEIGHT }}
          >
            <Ionicons name={CIRCLE_TOPIC_ICONS[topic]} size={20} color={CIRCLE_TOPIC_COLORS[topic].fg} />
          </View>
          <Pressable
            className="flex-1"
            disabled={!onPressSubtitle}
            onPress={onPressSubtitle}
            accessibilityRole={onPressSubtitle ? "button" : undefined}
            accessibilityHint={onPressSubtitle ? t("circles.members") : undefined}
          >
            <Text className="font-display text-lg text-ink-900" numberOfLines={1}>
              {name}
            </Text>
            {subtitle && onPressSubtitle ? (
              // A pill, so it reads as something to tap: who's in the circle.
              <View className="mt-0.5 shrink flex-row items-center gap-1 self-start rounded-full bg-white/70 py-0.5 pl-2 pr-1.5">
                <Ionicons name="people" size={12} color="#2B2320" />
                <Text className="shrink text-xs font-medium text-ink-900" numberOfLines={1}>
                  {subtitle}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#2B2320" />
              </View>
            ) : subtitle ? (
              <Text className="text-xs text-ink-700" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </Pressable>
        </View>
      }
    />
  );
}

// A circle's page (or its members) before the circle has loaded: the header with a
// working back button and placeholders for the name, then placeholder rows below.
export function CirclePageSkeleton({ onBack, wide }: { onBack: () => void; wide: boolean }) {
  const { t } = useTranslation();
  const back = (
    <Pressable accessibilityLabel={t("common.back")} hitSlop={8} onPress={onBack}>
      <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
    </Pressable>
  );
  if (wide) {
    return (
      <View className="flex-1 gap-5 bg-primary-50 px-20 pt-9 dark:bg-ink-950">
        <View className="flex-row items-center gap-4">
          {back}
          <SkeletonPulse style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Bone className="h-14 w-14 rounded-2xl" />
            <View className="flex-1 gap-2">
              <Bone className="h-8 w-72 rounded-full" />
              <Bone className="h-3.5 w-40 rounded-full" />
            </View>
          </SkeletonPulse>
        </View>
        <RowsSkeleton rows={4} avatar={48} />
      </View>
    );
  }
  return (
    <View className="flex-1 bg-primary-50 dark:bg-ink-950">
      <AppHeader
        left={
          <View className="flex-1 flex-row items-center gap-2">
            {back}
            <SkeletonPulse style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Bone className="rounded-lg" style={{ width: HEADER_ICON_HEIGHT, height: HEADER_ICON_HEIGHT }} />
              <View className="flex-1 gap-1.5">
                <Bone className="h-4 w-40 rounded-full" />
                <Bone className="h-3 w-28 rounded-full" />
              </View>
            </SkeletonPulse>
          </View>
        }
      />
      <View className="px-4 pt-4">
        <RowsSkeleton rows={4} avatar={48} />
      </View>
    </View>
  );
}
