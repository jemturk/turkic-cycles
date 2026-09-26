import { Text, View } from "react-native";

import { Chip } from "@/components/Chip";

type SegmentedToggleProps = {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
};

export function SegmentedToggle({ label, value, onChange }: SegmentedToggleProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="flex-1 text-sm font-medium text-ink-700">{label}</Text>
      <View className="flex-row gap-2">
        <Chip label="Yes" selected={value} onPress={() => onChange(true)} />
        <Chip label="No" selected={!value} onPress={() => onChange(false)} />
      </View>
    </View>
  );
}
