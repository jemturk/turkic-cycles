import { View } from "react-native";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import { Chip } from "@/components/Chip";

type SegmentedToggleProps = {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
};

export function SegmentedToggle({ label, value, onChange }: SegmentedToggleProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between">
      <Text className="flex-1 text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
      <View className="flex-row gap-2">
        <Chip label={t("common.yes")} selected={value} onPress={() => onChange(true)} />
        <Chip label={t("common.no")} selected={!value} onPress={() => onChange(false)} />
      </View>
    </View>
  );
}
