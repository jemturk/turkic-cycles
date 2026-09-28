import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type RefreshableScrollViewProps = ScrollViewProps & {
  refreshing: boolean;
  onRefresh: () => void;
};

const PULL_THRESHOLD = 64;
const MAX_PULL = 100;

// react-native-web has no pull-to-refresh gesture built in -- RN's own
// RefreshControl (used below on native) is a documented no-op there. The one
// community package for this (react-native-web-refresh-control) turned out to be
// broken on this project's react-native-web version: confirmed via direct testing
// that it throws ("findNodeHandle is not supported on web") on every drag and
// never calls onRefresh. Built on react-native-gesture-handler + reanimated
// instead, both already dependencies here, rather than adding another one.
export function RefreshableScrollView({ refreshing, onRefresh, children, ...scrollViewProps }: RefreshableScrollViewProps) {
  if (Platform.OS !== "web") {
    return (
      <ScrollView
        {...scrollViewProps}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D9663D" />}
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
  // Read from the gesture (UI thread) callbacks -- a ref avoids a state update
  // (and re-render) on every scroll frame just to know "are we at the top".
  const scrollY = useRef(0);
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

  const pan = Gesture.Pan()
    // Only claims the gesture once a drag is clearly vertical and downward;
    // any horizontal or upward movement fails it immediately, handing the
    // gesture back to the ScrollView's own native scrolling.
    .activeOffsetY(15)
    .failOffsetY(-15)
    .failOffsetX([-15, 15])
    /* eslint-disable react-hooks/refs, react-hooks/immutability --
       these onUpdate/onEnd callbacks are reanimated worklets: they're written
       inline here but only ever execute later, on the UI thread, during a real
       gesture -- never during this component's own render. Mutating a shared
       value's .value from inside them is reanimated's own documented API, not
       a stray render-time ref write; the plugin's static analysis can't tell
       "defined during render" apart from "runs later as a worklet". */
    .onUpdate((e) => {
      if (scrollY.current > 1) return;
      pull.value = Math.max(0, Math.min(e.translationY, MAX_PULL));
    })
    .onEnd(() => {
      if (pull.value > PULL_THRESHOLD && scrollY.current <= 1) {
        pull.value = withTiming(PULL_THRESHOLD, { duration: 150 });
        onRefresh();
      } else {
        pull.value = withTiming(0, { duration: 150 });
      }
    });
  /* eslint-enable react-hooks/refs, react-hooks/immutability */

  const indicatorStyle = useAnimatedStyle(() => ({
    height: pull.value,
    opacity: pull.value / PULL_THRESHOLD,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }}>
        <Animated.View
          className="items-center justify-center overflow-hidden"
          style={indicatorStyle}
        >
          <ActivityIndicator color="#D9663D" />
        </Animated.View>
        <ScrollView {...scrollViewProps} onScroll={handleScroll} scrollEventThrottle={16}>
          {children}
        </ScrollView>
      </View>
    </GestureDetector>
  );
}
