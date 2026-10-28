import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Text } from "@/components/Text";

const THUMB = 28;

// One palette hue per slider, so a page of them isn't all one colour. Full class
// names (not built from parts) so NativeWind finds them.
const TONES = {
  primary: {
    track: "bg-primary-100",
    fill: "bg-primary-500",
    thumb: "border-primary-500",
    pill: "bg-primary-100 dark:bg-primary-500/25",
    text: "text-primary-600 dark:text-primary-100",
  },
  accent: {
    track: "bg-accent-50",
    fill: "bg-accent-500",
    thumb: "border-accent-500",
    pill: "bg-accent-50 dark:bg-accent-500/25",
    text: "text-accent-600 dark:text-accent-400",
  },
  gold: {
    track: "bg-gold-100/60",
    fill: "bg-gold-600",
    thumb: "border-gold-600",
    pill: "bg-gold-100 dark:bg-gold-600/30",
    text: "text-gold-600 dark:text-gold-100",
  },
} as const;
export type SliderTone = keyof typeof TONES;

type Props = {
  label: string;
  // What the current value reads as, shown at the right of the label ("25 – 40").
  valueLabel: string;
  // How many stops the track has; values are stop indexes, 0 to stops - 1.
  stops: number;
  // One index for a single thumb, or [low, high] for a range.
  value: number[];
  // The state setter itself (stable), so each thumb's drag handler can stay the same
  // for the whole drag.
  onChange: Dispatch<SetStateAction<number[]>>;
  // Spoken for each thumb's index (screen readers), e.g. "40 years".
  describe: (index: number) => string;
  tone?: SliderTone;
};

// A slider that snaps to fixed stops, with one thumb or two (a range: the thumbs can
// meet but not cross). Built on Gesture Handler + Reanimated like the Discover deck,
// so it drags smoothly on phones and with a mouse on web.
export function StepSlider({ label, valueLabel, stops, value, onChange, describe, tone = "primary" }: Props) {
  const width = useSharedValue(0);
  const colors = TONES[tone];
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
        <View className={`rounded-full px-3 py-1 ${colors.pill}`}>
          <Text className={`text-sm font-semibold ${colors.text}`}>{valueLabel}</Text>
        </View>
      </View>
      <View
        style={{
          height: THUMB + 8,
          justifyContent: "center",
          marginHorizontal: THUMB / 2,
        }}
        onLayout={(e: LayoutChangeEvent) => {
          width.set(e.nativeEvent.layout.width);
        }}
      >
        <View className={`h-1.5 rounded-full dark:bg-ink-700 ${colors.track}`} />
        <Fill width={width} stops={stops} value={value} className={colors.fill} />
        {value.map((index, i) => (
          <Thumb
            key={i}
            width={width}
            stops={stops}
            index={index}
            // A range's thumbs stop at each other.
            minIndex={i === 1 ? value[0] : 0}
            maxIndex={i === 0 && value.length === 2 ? value[1] : stops - 1}
            thumb={i}
            onChange={onChange}
            describe={describe}
            label={label}
            className={colors.thumb}
          />
        ))}
      </View>
    </View>
  );
}

// The coloured part of the track: from the low thumb (or the start) to the high one.
function Fill({
  width,
  stops,
  value,
  className,
}: {
  width: SharedValue<number>;
  stops: number;
  value: number[];
  className: string;
}) {
  const low = value.length === 2 ? value[0] : 0;
  const high = value[value.length - 1];
  const style = useAnimatedStyle(() => {
    const step = width.value / Math.max(stops - 1, 1);
    return { left: low * step, width: (high - low) * step };
  });
  return <Animated.View className={`absolute h-1.5 rounded-full ${className}`} style={style} />;
}

function Thumb({
  width,
  stops,
  index,
  minIndex,
  maxIndex,
  thumb,
  onChange,
  describe,
  label,
  className,
}: {
  width: SharedValue<number>;
  stops: number;
  index: number;
  minIndex: number;
  maxIndex: number;
  thumb: number;
  onChange: Dispatch<SetStateAction<number[]>>;
  describe: (index: number) => string;
  label: string;
  className: string;
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

  // Kept the same across renders (the setter is stable), and so is the gesture: a new
  // gesture each render swapped the handler mid-drag, since every stop crossed
  // re-renders the screen, and the rest of the drag was lost.
  const settle = useCallback(
    (next: number) => onChange((current) => current.map((v, j) => (j === thumb ? next : v))),
    [onChange, thumb]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
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
            runOnJS(settle)(rounded);
          }
        })
        .onFinalize(() => {
          dragging.set(false);
          const rounded = Math.round(position.value);
          position.set(withTiming(rounded, { duration: 120 }));
          if (rounded !== lastIndex.value) {
            lastIndex.set(rounded);
            runOnJS(settle)(rounded);
          }
        }),
    [width, stops, minIndex, maxIndex, start, position, lastIndex, dragging, settle]
  );

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
          if (next >= minIndex && next <= maxIndex) settle(next);
        }}
        className={`absolute left-0 rounded-full border-2 bg-white dark:bg-ink-900 ${className}`}
        style={[
          {
            width: THUMB,
            height: THUMB,
            elevation: 2,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
          },
          style,
        ]}
      />
    </GestureDetector>
  );
}
