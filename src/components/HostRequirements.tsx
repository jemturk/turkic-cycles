import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";

// Shown instead of the create-circle / create-event form to someone who can't host
// yet (migration 0035): what's needed, what they already have, and where to get
// the rest.
export function HostRequirements({ hasPlus, verified }: { hasPlus: boolean; verified: boolean }) {
  const { t } = useTranslation();

  return (
    <View className="gap-3">
      <Text className="text-base text-ink-700 dark:text-ink-200">{t("circles.hostRequirements")}</Text>
      <RequirementRow label={t("circles.requirePlus")} met={hasPlus} onPress={() => router.push("/(app)/plus")} />
      <RequirementRow
        label={t("circles.requireVerified")}
        met={verified}
        onPress={() => router.push("/(app)/settings/verification", { withAnchor: true })}
      />
    </View>
  );
}

function RequirementRow({ label, met, onPress }: { label: string; met: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={met}
      className="flex-row items-center gap-3 rounded-xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3"
    >
      <Ionicons name={met ? "checkmark-circle" : "ellipse-outline"} size={22} color={met ? "#2C8B80" : "#9CA3AF"} />
      <Text className="flex-1 text-base text-ink-900 dark:text-ink-50">{label}</Text>
      {met ? null : <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
    </Pressable>
  );
}
