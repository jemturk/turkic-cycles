import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useColorScheme } from "nativewind";

// One bounce: up and darker, back down, then a rest so the three read as a wave.
const RISE_MS = 300;
const REST_MS = 600;

function Dot({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: RISE_MS, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: REST_MS })
        ),
        -1,
        false
      )
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + progress.value * 0.45,
    transform: [{ translateY: -4 * progress.value }],
  }));

  // Inline style rather than className -- see the note on DiscoverDeck's
  // Animated.View: NativeWind classes on Reanimated views don't reliably apply.
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />;
}

// The other participant's "typing..." bubble: a lighter shade of their peach message
// bubble, so it reads as their next message on its way, with dark dots bouncing in a
// wave. It fades in and out rather than popping. (Their full bubble color read as a
// message in its own right.)
export function TypingDots() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} className="items-start">
      <View
        className="flex-row items-center gap-1.5 rounded-[20px] px-4 py-3.5"
        style={{ backgroundColor: dark ? "#3A302C" : "#FBEAE2" }}
      >
        <Dot delay={0} color={dark ? "#E8DED8" : "#2B2320"} />
        <Dot delay={150} color={dark ? "#E8DED8" : "#2B2320"} />
        <Dot delay={300} color={dark ? "#E8DED8" : "#2B2320"} />
      </View>
    </Animated.View>
  );
}
