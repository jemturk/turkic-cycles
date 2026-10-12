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
import Svg, { Circle, Polygon } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

// Mirrors AppMark.tsx's geometry exactly, white star included. The native splash screen
// (expo-splash-screen) can only show one static image, so once it's hidden
// this JS overlay plays the two circles sliding together -- the logo
// "assembling" itself -- before handing off to the real app underneath.
//
// The native splash's image is a transparent PNG (app.json, assets/splash-blank.png)
// on the same background color, so launch starts on a blank screen and the logo
// first appears here, assembling. A real logo there showed the finished mark first,
// then the animation built the same mark again. (Transparent rather than no image:
// Android 12+ shows the app icon when the splash has none.)
const STAR_POINTS =
  "100,10 114.5,64.9 163.6,36.4 135.1,85.5 190,100 135.1,114.5 163.6,163.6 114.5,135.1 " +
  "100,190 85.5,135.1 36.4,163.6 64.9,114.5 10,100 64.9,85.5 36.4,36.4 85.5,64.9";

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const coralX = useSharedValue(-20);
  const tealX = useSharedValue(180);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(1);
  const starOpacity = useSharedValue(0);

  useEffect(() => {
    const converge = Easing.out(Easing.cubic);
    coralX.value = withTiming(62, { duration: 550, easing: converge });
    tealX.value = withTiming(98, { duration: 550, easing: converge });
    // The star sits still while the circles slide in, so it fades in as they land
    // -- otherwise it would float alone on the backdrop before they arrive.
    starOpacity.value = withDelay(350, withTiming(1, { duration: 250 }));
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
  const starProps = useAnimatedProps(() => ({ opacity: starOpacity.value }));
  // Opacity only on the full-screen backdrop -- scaling it too (as the logo's
  // "pop" does) shrank the backdrop below full size, briefly exposing the app
  // around its edges.
  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents="none">
      <Animated.View style={logoStyle}>
        {/* Wider than the logo's own 160-unit box: the circles start off to each
            side (cx -20 and 180, radius 52), and anything outside the viewBox is
            clipped -- which cut their outer edges flat at the start. Same scale as
            a 120px logo (0.75px per unit), just with 80 units of room per side. */}
        <Svg width={240} height={120} viewBox="-80 0 320 160">
          <AnimatedCircle cy="80" r="52" fill="#C1440E" animatedProps={coralProps} />
          <AnimatedCircle cy="80" r="52" fill="#127A87" animatedProps={tealProps} />
          <AnimatedPolygon
            points={STAR_POINTS}
            fill="#FFFFFF"
            transform="translate(80,80) scale(0.2) translate(-100,-100)"
            animatedProps={starProps}
          />
        </Svg>
      </Animated.View>
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
    backgroundColor: "#FCEAD6",
    zIndex: 999,
  },
});
