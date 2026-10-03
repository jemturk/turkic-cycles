import { Pressable } from "react-native";
import { Text } from "@/components/Text";

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function Chip({ label, selected, onPress, disabled }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "rounded-full border px-4 py-2",
        selected ? "border-primary-500 bg-primary-500" : "border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <Text className={selected ? "text-sm font-medium text-white" : "text-sm font-medium text-ink-700 dark:text-ink-200"}>
        {label}
      </Text>
    </Pressable>
  );
}
