import { Pressable } from "react-native";
import { Text } from "@/components/Text";
import type { TagTone } from "@/constants/tagTones";

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Selected in this soft tint (TAG_TONES) instead of solid teal. */
  tone?: TagTone;
};

export function Chip({ label, selected, onPress, disabled, tone }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "rounded-full border px-4 py-2",
        selected
          ? tone
            ? `border-transparent ${tone.bg} dark:bg-ink-700`
            : "border-primary-500 bg-primary-500"
          : "border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      <Text
        className={
          selected
            ? tone
              ? `text-sm font-semibold dark:text-ink-50 ${tone.text}`
              : "text-sm font-medium text-white"
            : "text-sm font-medium text-ink-700 dark:text-ink-200"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
