import type { ReactNode } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/Text";

// An empty list's illustration: the screen's own icon in a soft halo, with a couple of
// satellite dots so it reads as an illustration rather than a stray glyph. Fills and
// centres in its parent; inside a scroll view, pass a className with fixed padding.
export function EmptyState({
  icon,
  label,
  className = "flex-1 pb-16",
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  className?: string;
  /** A button under the label (e.g. Discover's "Change filters"). */
  action?: ReactNode;
}) {
  return (
    <View className={`items-center justify-center gap-6 px-4 ${className}`}>
      <View className="h-40 w-40 items-center justify-center rounded-full bg-primary-100/60 dark:bg-ink-800/60">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-primary-100 dark:bg-ink-800">
          {/* The one white surface, so it gets a lighter take on the cards' shadow. */}
          <View
            className="h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-ink-700"
            style={{ boxShadow: "0px 2px 8px rgba(43, 35, 32, 0.08)" }}
          >
            <Ionicons name={icon} size={32} className="text-primary-500" />
          </View>
        </View>
        <View className="absolute right-3 top-5 h-3 w-3 rounded-full bg-accent-500" />
        <View className="absolute bottom-6 left-2 h-2 w-2 rounded-full bg-primary-500/50" />
        <View className="absolute left-7 top-2 h-1.5 w-1.5 rounded-full bg-accent-500/60" />
      </View>
      <Text className="max-w-xs text-center text-base text-ink-700 dark:text-ink-200">{label}</Text>
      {action}
    </View>
  );
}
