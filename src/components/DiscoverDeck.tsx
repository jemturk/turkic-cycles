import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useDiscoverCandidates, useRecordSwipe } from "@/hooks/useDiscover";
import { useOtherUserVerificationStatus } from "@/hooks/useVerification";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";
import { DiscoverCardView } from "@/components/DiscoverCardView";
import { SwipeButton } from "@/components/SwipeButton";
import { DiscoverGrid } from "@/components/DiscoverGrid";
import { useWideLayout } from "@/hooks/useWideLayout";
import { DECK_PEEK } from "@/lib/discoverCard";

// How far (points) or how fast (points/second) a vertical swipe has to go to count
// -- up to skip, down to go back; anything less springs the card back.
const SKIP_DISTANCE = 120;
const SKIP_VELOCITY = 900;

// The one-at-a-time candidate card with pass / save / like, shared by a circle's
// "Meet members" screen (circleId) and the global Discover tab (circleId null).
// Renders as siblings (a fragment), so it fills whatever flex-1 container holds it.
//
// Swiping the card up skips it: the next person shows and nothing is recorded --
// the skipped person isn't passed, liked or saved, just moved to the back of the
// queue, so they come round again (and can reappear on a later visit). Swiping down
// brings back the most recently skipped person, one step at a time.
//
// On a wide (desktop web) window it's a grid of cards instead (DiscoverGrid).
export function DiscoverDeck(props: DiscoverDeckProps) {
  const wide = useWideLayout();
  return wide ? <DiscoverGrid {...props} /> : <SwipeDeck {...props} />;
}

type DiscoverDeckProps = {
  circleId: string | null | undefined;
  emptyLabel: string;
  onOpenProfile: (userId: string) => void;
};

function SwipeDeck({ circleId, emptyLabel, onOpenProfile }: DiscoverDeckProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: candidates, isLoading } = useDiscoverCandidates(circleId, userId);
  const recordSwipe = useRecordSwipe(circleId, userId);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  // The queue order this visit (user ids), and the skips in the order they happened
  // so swiping down can undo them. The candidate list can change underneath (a fresh
  // batch after a like/pass/save): people no longer in it drop out of the order, and
  // newcomers join at the end.
  const [order, setOrder] = useState<string[]>([]);
  const [skipHistory, setSkipHistory] = useState<string[]>([]);

  const byId = new Map((candidates ?? []).map((c) => [c.userId, c]));
  const inOrder = new Set(order);
  const queueIds = [
    ...order.filter((id) => byId.has(id)),
    ...(candidates ?? []).filter((c) => !inOrder.has(c.userId)).map((c) => c.userId),
  ];
  const candidate = queueIds.length > 0 ? byId.get(queueIds[0]) : undefined;
  // Who's next, peeking out under the card -- a hint that there's more to swipe up to.
  const nextCandidate = queueIds.length > 1 ? byId.get(queueIds[1]) : undefined;
  // The last skip whose person is still around (they may have been acted on since).
  const backId = [...skipHistory].reverse().find((id) => byId.has(id) && id !== candidate?.userId);
  const canGoBack = backId !== undefined;
  const { data: candidateVerification } = useOtherUserVerificationStatus(candidate?.userId);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.set(0);
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.userId, order]);

  // The card follows the finger and fades as it leaves, either way, and the next
  // one fades in. Only the card: the buttons below stay put -- they used to share
  // this fade, so every swipe made them blink.
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value * interpolate(Math.abs(translateY.value), [0, 400], [1, 0.2], "clamp"),
  }));

  function skip(skippedUserId: string) {
    setOrder([...queueIds.filter((id) => id !== skippedUserId), skippedUserId]);
    setSkipHistory((history) => [...history, skippedUserId]);
  }

  function goBack(returningUserId: string) {
    setOrder([returningUserId, ...queueIds.filter((id) => id !== returningUserId)]);
    setSkipHistory((history) => history.slice(0, history.lastIndexOf(returningUserId)));
  }

  // Vertical only: it activates after 12pt of up or down movement and gives way to
  // sideways movement, so a tap still opens the profile. With nothing to go back
  // to, a downward drag only stretches a little and springs back.
  const verticalSwipe = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      // .set() rather than assigning .value: same effect, and it's the form the
      // React Compiler lint accepts for Reanimated shared values.
      translateY.set(e.translationY > 0 && !canGoBack ? e.translationY * 0.2 : e.translationY);
    })
    .onEnd((e) => {
      const up = e.translationY < -SKIP_DISTANCE || e.velocityY < -SKIP_VELOCITY;
      const down = e.translationY > SKIP_DISTANCE || e.velocityY > SKIP_VELOCITY;
      if (candidate && up) {
        const id = candidate.userId;
        translateY.set(
          withTiming(-1000, { duration: 220 }, (finished) => {
            if (finished) runOnJS(skip)(id);
          })
        );
      } else if (down && backId !== undefined) {
        const id = backId;
        translateY.set(
          withTiming(1000, { duration: 220 }, (finished) => {
            if (finished) runOnJS(goBack)(id);
          })
        );
      } else {
        translateY.set(withSpring(0));
      }
    });

  function onSwipe(action: "like" | "pass" | "save") {
    if (!candidate) return;
    recordSwipe.mutate(
      { targetId: candidate.userId, action },
      {
        onSuccess: (isMatch) => {
          if (isMatch) setMatchedName(candidate.displayName);
        },
      }
    );
  }

  return (
    <>
      {isLoading ? null : !candidate ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base text-ink-700 dark:text-ink-200">{emptyLabel}</Text>
        </View>
      ) : (
        // The card fills the space above the buttons (flex: 1). Its Animated.View
        // below takes inline styles, not className: NativeWind classes on Reanimated
        // views don't reliably apply (on web they're dropped), which once left the
        // card only as tall as its text.
        <View style={{ flex: 1, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
          {/* The next person's card, behind this one: a little narrower and DECK_PEEK
              lower, so its bottom edge shows under the card like the next in a deck.
              Decoration only -- not pressable, hidden from screen readers. */}
          {nextCandidate ? (
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ position: "absolute", top: DECK_PEEK, bottom: 0, left: 10, right: 10, opacity: 0.6 }}
            >
              <DiscoverCardView person={nextCandidate} verificationStatus={undefined} />
            </View>
          ) : null}
          <GestureDetector gesture={verticalSwipe}>
            <Animated.View style={[{ flex: 1, marginBottom: DECK_PEEK }, cardStyle]}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => onOpenProfile(candidate.userId)}
                accessibilityHint={t("discover.swipeUpHint")}
                // Screen readers can't swipe the card, so skip and back are actions too.
                accessibilityActions={[
                  { name: "skip", label: t("discover.skip") },
                  ...(canGoBack ? [{ name: "back", label: t("discover.previous") }] : []),
                ]}
                onAccessibilityAction={(e) => {
                  if (e.nativeEvent.actionName === "skip") skip(candidate.userId);
                  if (e.nativeEvent.actionName === "back" && backId !== undefined) goBack(backId);
                }}
              >
                <DiscoverCardView person={candidate} verificationStatus={candidateVerification} />
              </Pressable>
            </Animated.View>
          </GestureDetector>
          </View>

          <View className="mt-4 flex-row items-center justify-center gap-6">
            <SwipeButton action="pass" onPress={() => onSwipe("pass")} />
            <SwipeButton action="save" onPress={() => onSwipe("save")} />
            <SwipeButton action="like" onPress={() => onSwipe("like")} />
          </View>
        </View>
      )}

      <MatchCelebrationModal matchedName={matchedName} onDismiss={() => setMatchedName(null)} />
    </>
  );
}
