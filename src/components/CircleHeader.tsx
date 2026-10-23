import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { AppHeader, HEADER_ICON_HEIGHT } from "@/components/AppHeader";
import { CIRCLE_TOPIC_COLORS, CIRCLE_TOPIC_ICONS, type CircleTopic } from "@/constants/circles";

// AppHeader in the circle's topic color, with a back button, topic badge and the
// circle's name in place of the logo. The topic colors are light in both themes,
// so the text and icons stay dark rather than following dark mode.
export function CircleHeader({
  name,
  topic,
  onBack,
  right,
  subtitle,
}: {
  name: string;
  topic: CircleTopic;
  onBack: () => void;
  /** In place of search and your avatar -- the circle page's ⋯ menu. */
  right?: ReactNode;
  /** A line under the name -- the circle page's "16 members · Tampa, FL". */
  subtitle?: string;
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
          <View className="flex-1">
            <Text className="font-display text-lg text-ink-900" numberOfLines={1}>
              {name}
            </Text>
            {subtitle ? (
              <Text className="text-xs text-ink-700" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      }
    />
  );
}
