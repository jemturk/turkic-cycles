import { useEffect, useRef } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const SPINNER_SIZE = 28;
const SPINNER_BORDER_WIDTH = 3;

// RN's own ActivityIndicator renders as a chunky, static-looking partial ring on web
// (confirmed by the user's screenshot) -- there's no web-native equivalent of the OS's
// own spinner, so this fakes the familiar Material/Google spinner look instead: a
// faint full ring with one solid-colored arc, continuously rotated.
function WebSpinner({ color }: { color: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 700, easing: Easing.linear }), -1, false);
  }, [rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View
      style={[
        {
          width: SPINNER_SIZE,
          height: SPINNER_SIZE,
          borderRadius: SPINNER_SIZE / 2,
          borderWidth: SPINNER_BORDER_WIDTH,
          borderColor: `${color}33`,
          borderTopColor: color,
        },
        style,
      ]}
    />
  );
}

type RefreshableScrollViewProps = ScrollViewProps & {
  refreshing: boolean;
  onRefresh: () => void;
};

const PULL_THRESHOLD = 64;
const MAX_PULL = 100;

// react-native-web passes touch handlers something much closer to the raw DOM
// TouchEvent than RN's own normalized nativeEvent: pageY lives on an entry in
// `touches` (or, once a touch has ended, `changedTouches`), not on nativeEvent
// directly. Confirmed with a real synthetic TouchEvent, not assumed -- the initial
// version read nativeEvent.pageY directly and silently got `undefined` every time.
function touchPageY(e: GestureResponderEvent): number | undefined {
  const native = e.nativeEvent as unknown as {
    pageY?: number;
    touches?: { pageY: number }[];
    changedTouches?: { pageY: number }[];
  };
  return native.pageY ?? native.touches?.[0]?.pageY ?? native.changedTouches?.[0]?.pageY;
}

// react-native-web has no pull-to-refresh gesture built in -- RN's own
// RefreshControl (used below on native) is a documented no-op there.
//
// Web history here, in order of what was tried and confirmed not to work rather
// than assumed:
//  1. The community package for exactly this gap (react-native-web-refresh-control)
//     throws ("findNodeHandle is not supported on web") on every drag and never
//     calls onRefresh -- confirmed directly, not just from its own caveats.
//  2. A react-native-gesture-handler Pan gesture worked in a *mouse*-drag test, but
//     didn't fire on a real phone's touch drag -- gesture-handler's web layer sets
//     its own touch-action on the wrapped view, which fought the ScrollView's own
//     touch handling for real touch input in a way a synthetic mouse drag never
//     exercises.
// This version drops both in favor of plain onTouchStart/Move/End directly on the
// ScrollView itself -- passive listeners that only ever read coordinates, never
// call preventDefault or claim the gesture, so the browser's/ScrollView's own touch
// scrolling is never in competition with anything.
export function RefreshableScrollView({ refreshing, onRefresh, children, ...scrollViewProps }: RefreshableScrollViewProps) {
  if (Platform.OS !== "web") {
    return (
      <ScrollView
        {...scrollViewProps}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#127A87" />}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <WebPullToRefresh refreshing={refreshing} onRefresh={onRefresh} {...scrollViewProps}>
      {children}
    </WebPullToRefresh>
  );
}

function WebPullToRefresh({
  refreshing,
  onRefresh,
  children,
  onScroll,
  ...scrollViewProps
}: RefreshableScrollViewProps) {
  const scrollY = useRef(0);
  // Set on touch start only when already scrolled to the top; null whenever a
  // touch begins mid-list, so mid-list scrolling is never mistaken for a pull.
  const startY = useRef<number | null>(null);
  const pull = useSharedValue(0);

  useEffect(() => {
    // Once the caller's own refresh finishes, collapse the indicator; while it's
    // true, hold it open at the threshold height instead of springing back to 0
    // immediately after release, so the spinner stays visible for the duration.
    if (!refreshing) pull.value = withTiming(0, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  }

  function handleTouchStart(e: GestureResponderEvent) {
    startY.current = scrollY.current <= 1 ? (touchPageY(e) ?? null) : null;
  }

  // pull is a reanimated shared value; writing .value is its own documented API,
  // not a stray render-time ref write -- these handlers only ever run from a real
  // touch event, never during this component's render, but the lint rule can't
  // tell "defined during render" apart from "runs later as an event handler".
  function handleTouchMove(e: GestureResponderEvent) {
    if (startY.current === null || scrollY.current > 1) return;
    const y = touchPageY(e);
    if (y === undefined) return;
    const delta = y - startY.current;
    // eslint-disable-next-line react-hooks/immutability
    pull.value = Math.max(0, Math.min(delta, MAX_PULL));
  }

  function handleTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;
    if (pull.value > PULL_THRESHOLD) {
      // eslint-disable-next-line react-hooks/immutability
      pull.value = withTiming(PULL_THRESHOLD, { duration: 150 });
      onRefresh();
    } else {
      pull.value = withTiming(0, { duration: 150 });
    }
  }

  const indicatorStyle = useAnimatedStyle(() => ({
    height: pull.value,
    opacity: pull.value / PULL_THRESHOLD,
  }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={[{ width: "100%", alignItems: "center", justifyContent: "center", overflow: "hidden" }, indicatorStyle]}
      >
        <WebSpinner color="#127A87" />
      </Animated.View>
      <ScrollView
        {...scrollViewProps}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {children}
      </ScrollView>
    </View>
  );
}
