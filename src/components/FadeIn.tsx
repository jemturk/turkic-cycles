import { useEffect, type ReactNode } from "react";
import type { ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

// Content that arrives after a loading placeholder eases in (a quick fade and a few
// pixels' rise) instead of popping. Once, on mount; not with reduced motion. Inline
// styles only: NativeWind classes on Reanimated views drop on web, so callers pass
// layout through style.
export function FadeIn({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
  }, [progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
