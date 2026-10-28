import { useEffect } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { Text } from "@/components/Text";

const THUMB = 28;

type Props = {
  label: string;
  // What the current value reads as, shown at the right of the label ("25 – 40").
  valueLabel: string;
  // How many stops the track has; values are stop indexes, 0 to stops - 1.
  stops: number;
  // One index for a single thumb, or [low, high] for a range.
  value: number[];
  onChange: (value: number[]) => void;
  // Spoken for each thumb's index (screen readers), e.g. "40 years".
  describe: (index: number) => string;
};

// A slider that snaps to fixed stops, with one thumb or two (a range: the thumbs can
// meet but not cross). Built on Gesture Handler + Reanimated like the Discover deck,
// so it drags smoothly on phones and with a mouse on web.
export function StepSlider({ label, valueLabel, stops, value, onChange, describe }: Props) {
  const width = useSharedValue(0);
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
        <Text className="text-base font-semibold text-primary-600 dark:text-primary-300">{valueLabel}</Text>
      </View>
      <View
        style={{ height: THUMB + 8, justifyContent: "center", marginHorizontal: THUMB / 2 }}
        onLayout={(e: LayoutChangeEvent) => {
          width.set(e.nativeEvent.layout.width);
        }}
      >
        <View className="h-1.5 rounded-full bg-primary-100 dark:bg-ink-700" />
        <Fill width={width} stops={stops} value={value} />
        {value.map((index, i) => (
          <Thumb
            key={i}
            width={width}
            stops={stops}
            index={index}
            // A range's thumbs stop at each other.
            minIndex={i === 1 ? value[0] : 0}
            maxIndex={i === 0 && value.length === 2 ? value[1] : stops - 1}
            onSettle={(next) => onChange(value.map((v, j) => (j === i ? next : v)))}
            describe={describe}
            label={label}
          />
        ))}
      </View>
    </View>
  );
}

// The coloured part of the track: from the low thumb (or the start) to the high one.
function Fill({ width, stops, value }: { width: SharedValue<number>; stops: number; value: number[] }) {
  const low = value.length === 2 ? value[0] : 0;
  const high = value[value.length - 1];
  const style = useAnimatedStyle(() => {
    const step = width.value / Math.max(stops - 1, 1);
    return { left: low * step, width: (high - low) * step };
  });
  return <Animated.View className="absolute h-1.5 rounded-full bg-primary-500" style={style} />;
}

function Thumb({
  width,
  stops,
  index,
  minIndex,
  maxIndex,
  onSettle,
  describe,
  label,
}: {
  width: SharedValue<number>;
  stops: number;
  index: number;
  minIndex: number;
  maxIndex: number;
  onSettle: (index: number) => void;
  describe: (index: number) => string;
  label: string;
}) {
  // Where the thumb is while dragging, as a fractional stop; it snaps on release.
  const position = useSharedValue(index);
  const start = useSharedValue(index);
  const lastIndex = useSharedValue(index);
  const dragging = useSharedValue(false);

  // Follow the value from outside (the other thumb, a screen reader), but not mid-drag:
  // the live updates while dragging would snap the thumb back to a whole stop.
  useEffect(() => {
    if (!dragging.value) {
      position.set(index);
      lastIndex.set(index);
    }
  }, [index, position, lastIndex, dragging]);

  const pan = Gesture.Pan()
    .hitSlop(12)
    // A small sideways move starts the drag, so the page still scrolls under a vertical swipe.
    .activeOffsetX([-3, 3])
    .onStart(() => {
      dragging.set(true);
      start.set(position.value);
    })
    .onUpdate((e) => {
      const step = width.value / Math.max(stops - 1, 1);
      if (step <= 0) return;
      const next = Math.min(Math.max(start.value + e.translationX / step, minIndex), maxIndex);
      position.set(next);
      // Update the value label live, once per stop crossed.
      const rounded = Math.round(next);
      if (rounded !== lastIndex.value) {
        lastIndex.set(rounded);
        runOnJS(onSettle)(rounded);
      }
    })
    .onFinalize(() => {
      dragging.set(false);
      const rounded = Math.round(position.value);
      position.set(withTiming(rounded, { duration: 120 }));
      if (rounded !== lastIndex.value) {
        lastIndex.set(rounded);
        runOnJS(onSettle)(rounded);
      }
    });

  const style = useAnimatedStyle(() => {
    const step = width.value / Math.max(stops - 1, 1);
    return { transform: [{ translateX: position.value * step - THUMB / 2 }] };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: describe(index) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          const next = e.nativeEvent.actionName === "increment" ? index + 1 : index - 1;
          if (next >= minIndex && next <= maxIndex) onSettle(next);
        }}
        className="absolute left-0 rounded-full border-2 border-primary-500 bg-white dark:bg-ink-900"
        style={[{ width: THUMB, height: THUMB, elevation: 2, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }, style]}
      />
    </GestureDetector>
  );
}
