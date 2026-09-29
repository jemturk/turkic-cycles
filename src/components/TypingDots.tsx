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

function Dot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delay, translateY]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return <Animated.View className="h-1.5 w-1.5 rounded-full bg-ink-400" style={style} />;
}

// The other participant's "typing..." bubble -- styled like their own message
// bubbles (white, left-aligned) so it reads as a stand-in for their next message.
export function TypingDots() {
  return (
    <View className="items-start">
      <View className="flex-row items-center gap-1 rounded-2xl bg-white dark:bg-ink-800 px-4 py-3.5">
        <Dot delay={0} />
        <Dot delay={120} />
        <Dot delay={240} />
      </View>
    </View>
  );
}
