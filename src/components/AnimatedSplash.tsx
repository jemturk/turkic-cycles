import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, G, Mask, Polygon, Rect } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Mirrors AppMark.tsx's geometry exactly (see that file for why the star is a
// true SVG mask cutout, not a fill trick). The native splash screen
// (expo-splash-screen) can only show one static image, so once it's hidden
// this JS overlay plays the two circles sliding together -- the logo
// "assembling" itself -- before handing off to the real app underneath.
const STAR_POINTS =
  "100,10 114.5,64.9 163.6,36.4 135.1,85.5 190,100 135.1,114.5 163.6,163.6 114.5,135.1 " +
  "100,190 85.5,135.1 36.4,163.6 64.9,114.5 10,100 64.9,85.5 36.4,36.4 85.5,64.9";

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const coralX = useSharedValue(-20);
  const tealX = useSharedValue(180);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const converge = Easing.out(Easing.cubic);
    coralX.value = withTiming(62, { duration: 550, easing: converge });
    tealX.value = withTiming(98, { duration: 550, easing: converge });
    scale.value = withDelay(
      550,
      withSequence(
        withTiming(1.08, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    opacity.value = withDelay(
      1300,
      withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
    // Runs once on mount; onFinish is a stable setState callback from the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coralProps = useAnimatedProps(() => ({ cx: coralX.value }));
  const tealProps = useAnimatedProps(() => ({ cx: tealX.value }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <Svg width={120} height={120} viewBox="0 0 160 160">
        <Defs>
          <Mask id="animSplashStarCut" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
            <Rect x="0" y="0" width="160" height="160" fill="white" />
            <Polygon
              points={STAR_POINTS}
              fill="black"
              transform="translate(80,80) scale(0.2) translate(-100,-100)"
            />
          </Mask>
        </Defs>
        <G mask="url(#animSplashStarCut)">
          <AnimatedCircle cy="80" r="52" fill="#D9663D" animatedProps={coralProps} />
          <AnimatedCircle cy="80" r="52" fill="#2C8B80" animatedProps={tealProps} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDEDE5",
    zIndex: 999,
  },
});
