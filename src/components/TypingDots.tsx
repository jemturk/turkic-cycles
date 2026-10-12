import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useColorScheme } from "nativewind";

function Dot({ delay, color }: { delay: number; color: string }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
          withTiming(0.3, { duration: 400, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Inline style rather than className -- see the note on DiscoverDeck's
  // Animated.View: NativeWind classes on Reanimated views don't reliably apply.
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }, style]} />;
}

// The other participant's "typing..." bubble: a quiet white bubble (like the
// message input) with grey dots pulsing in a wave. Not their coral message color --
// a solid coral bubble read as a message in its own right and was too loud.
export function TypingDots() {
  const { colorScheme } = useColorScheme();
  const dotColor = colorScheme === "dark" ? "#C9BFB9" : "#8A7C76"; // ink-200 / ink-400
  return (
    <View className="items-start">
      <View className="flex-row items-center gap-1.5 rounded-2xl bg-white dark:bg-ink-800 px-4 py-3.5">
        <Dot delay={0} color={dotColor} />
        <Dot delay={160} color={dotColor} />
        <Dot delay={320} color={dotColor} />
      </View>
    </View>
  );
}
