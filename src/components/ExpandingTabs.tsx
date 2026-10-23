import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { Text } from "@/components/Text";

export type ExpandingTab<T extends string> = {
  value: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  count?: number;
};

type ExpandingTabsProps<T extends string> = {
  tabs: ExpandingTab<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Exported so a screen can wait for the tabs to settle before swapping heavy content.
export const EXPANDING_TABS_DURATION = 220;
const DURATION = EXPANDING_TABS_DURATION;
// Room for an icon and a count up to "99+".
const COLLAPSED_WIDTH = 64;
// Sizes in pixels, set as styles rather than h-10 / p-1: NativeWind's native rem
// differs from the web's, so on Android h-10 came out shorter than the track and the
// pill sat at the top of the bar instead of in the middle.
const TAB_HEIGHT = 40;
const TRACK_PADDING = 4;
const TRACK_BORDER = 1;
const TRACK_INSET = 2 * (TRACK_PADDING + TRACK_BORDER);
// Fixed so the bar doesn't jump while the first layout pass measures it.
const TRACK_HEIGHT = TAB_HEIGHT + TRACK_INSET;

function formatCount(count: number) {
  return count > 99 ? "99+" : `${count}`;
}

// A segmented control too narrow for every label: the selected tab grows to show
// its name, the rest shrink to icon + count. The label stays put (no timeout), so
// you can always tell where you are; switching just slides it to the next tab.
//
// Each tab animates its own width, all on the same clock, so one grows exactly as
// fast as another shrinks and the row always fits the track. (Reanimated's automatic
// layout transition did this on web, but on Android it animated each tab's position
// on its own and let neighbours slide across the selected one.)
export function ExpandingTabs<T extends string>({ tabs, value, onChange }: ExpandingTabsProps<T>) {
  const { colorScheme } = useColorScheme();
  // Icon colors as props, not classNames: the className didn't follow selection
  // changes on web, leaving the selected icon dark on the teal pill.
  const iconColor = colorScheme === "dark" ? "#C9BFB9" : "#4A3F3A"; // ink-200 / ink-700
  const [trackWidth, setTrackWidth] = useState(0);
  const expandedWidth = Math.max(trackWidth - TRACK_INSET - COLLAPSED_WIDTH * (tabs.length - 1), COLLAPSED_WIDTH);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={{ height: TRACK_HEIGHT, padding: TRACK_PADDING, borderWidth: TRACK_BORDER, alignItems: "center" }}
      className="flex-row rounded-full border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800"
    >
      {trackWidth > 0
        ? tabs.map((tab) => (
            <TabButton
              key={tab.value}
              tab={tab}
              selected={tab.value === value}
              width={tab.value === value ? expandedWidth : COLLAPSED_WIDTH}
              iconColor={iconColor}
              onPress={() => onChange(tab.value)}
            />
          ))
        : null}
    </View>
  );
}

function TabButton<T extends string>({
  tab,
  selected,
  width,
  iconColor,
  onPress,
}: {
  tab: ExpandingTab<T>;
  selected: boolean;
  width: number;
  iconColor: string;
  onPress: () => void;
}) {
  const animatedWidth = useSharedValue(width);
  useEffect(() => {
    animatedWidth.value = withTiming(width, { duration: DURATION });
  }, [animatedWidth, width]);
  const style = useAnimatedStyle(() => ({ width: animatedWidth.value }));

  const count = tab.count ?? 0;
  return (
    // Layout via style, not className, on every Animated.View: Reanimated's views
    // don't take NativeWind classes on web.
    <Animated.View style={[{ overflow: "hidden", borderRadius: 9999 }, style]}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={count > 0 ? `${tab.label}, ${count}` : tab.label}
        onPress={onPress}
        style={{ height: TAB_HEIGHT }}
        className={`flex-row items-center justify-center gap-1.5 rounded-full px-3 ${
          selected ? "bg-primary-500" : ""
        }`}
      >
        <Ionicons name={tab.icon} size={18} color={selected ? "#FFFFFF" : iconColor} />
        {selected ? (
          <Animated.View
            entering={FadeIn.duration(DURATION)}
            style={{ flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Text className="shrink text-sm font-semibold text-white" numberOfLines={1}>
              {tab.label}
            </Text>
            {count > 0 ? (
              <View className="h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5">
                <Text className="text-xs font-semibold text-white">{formatCount(count)}</Text>
              </View>
            ) : null}
          </Animated.View>
        ) : count > 0 ? (
          <Text className="text-xs font-medium text-ink-700 dark:text-ink-200">{formatCount(count)}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
