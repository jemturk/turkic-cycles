import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/Text";

// An on/off filter as a pill, e.g. Circles' "Near me": outlined when off, teal with a
// tick when on, so it reads as on without relying on the colour alone.
export function ToggleChip({
  label,
  on,
  onPress,
  accessibilityHint,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      aria-checked={on}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className={`h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 ${
        on
          ? "border-primary-500 bg-primary-100 dark:border-primary-400 dark:bg-ink-700"
          : "border-primary-100 bg-white web:hover:bg-primary-100/40 dark:border-ink-700 dark:bg-ink-800"
      }`}
    >
      <Ionicons name={on ? "location" : "location-outline"} size={16} color={on ? "#0E6470" : "#6B5E58"} />
      <Text className={`text-sm ${on ? "font-semibold text-primary-600 dark:text-primary-400" : "text-ink-900 dark:text-ink-50"}`}>
        {label}
      </Text>
      {on ? <Ionicons name="checkmark" size={16} color="#0E6470" /> : null}
    </Pressable>
  );
}
