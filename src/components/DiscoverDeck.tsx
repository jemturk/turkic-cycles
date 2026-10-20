import { useLayoutEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useDiscoverCandidates, useRecordSwipe } from "@/hooks/useDiscover";
import { useOtherUserVerificationStatus } from "@/hooks/useVerification";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";
import { DiscoverCardView } from "@/components/DiscoverCardView";
import { SwipeButton } from "@/components/SwipeButton";
import { DiscoverGrid } from "@/components/DiscoverGrid";
import { useWideLayout } from "@/hooks/useWideLayout";

// How far (points) or how fast (points/second) a vertical swipe has to go to count
// -- up to skip, down to go back; anything less springs the card back.
const SKIP_DISTANCE = 120;
const SKIP_VELOCITY = 900;
// The space between cards on the roll, seen while one slides in.
const ROLL_GAP = 16;

// The one-at-a-time candidate card with pass / save / like, shared by a circle's
// "Meet members" screen (circleId) and the global Discover tab (circleId null).
// Renders as siblings (a fragment), so it fills whatever flex-1 container holds it.
//
// The cards sit on a vertical roll, like photos: dragging up slides the card away
// and the next person's in from below, following the finger; dragging down brings
// the most recently skipped person back in from above. Let go past SKIP_DISTANCE (or
// fast enough) and it rolls on, otherwise it springs back. Skipping records nothing
// -- the skipped person isn't passed, liked or saved, just moved to the back of the
// queue, so they come round again (and can reappear on a later visit).
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
  // The last skip whose person is still around (they may have been acted on since).
  const backId = [...skipHistory].reverse().find((id) => byId.has(id) && id !== candidate?.userId);
  const canGoBack = backId !== undefined;
  // Their neighbours on the roll: who slides in from below, and from above.
  const nextCandidate = queueIds.length > 1 ? byId.get(queueIds[1]) : undefined;
  const previousCandidate = backId !== undefined ? byId.get(backId) : undefined;
  const { data: candidateVerification } = useOtherUserVerificationStatus(candidate?.userId);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  // One step along the roll: the card's height plus the gap. Measured, so the next
  // card lands exactly where this one was.
  const step = useSharedValue(0);
  // Whether the card just changed by rolling (already in place) or by a button.
  const rolled = useSharedValue(false);
  // While the roll hands over to the new person: the neighbours stay hidden for that
  // frame, so the one after next never flashes in the slot below.
  const swapping = useSharedValue(false);

  // A new person in front: back to the middle of the roll. After a roll they're
  // already where they belong, so no fade; after like / pass / save they fade in.
  useLayoutEffect(() => {
    translateY.set(0);
    requestAnimationFrame(() => swapping.set(false));
    if (rolled.get()) {
      rolled.set(false);
      opacity.set(1);
    } else {
      opacity.set(0);
      opacity.set(withTiming(1, { duration: 250 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.userId, order]);

  // The three cards move together with the finger. Only the cards: the buttons
  // below stay put.
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
  const nextStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + step.value }],
    opacity: swapping.value ? 0 : 1,
  }));
  const previousStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - step.value }],
    opacity: swapping.value ? 0 : 1,
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
  // sideways movement, so a tap still opens the profile. With no one to roll to in
  // that direction, the drag only stretches a little and springs back.
  const hasNext = nextCandidate !== undefined;
  const verticalSwipe = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      const blocked = e.translationY > 0 ? !canGoBack : !hasNext;
      // .set() rather than assigning .value: same effect, and it's the form the
      // React Compiler lint accepts for Reanimated shared values.
      translateY.set(blocked ? e.translationY * 0.2 : e.translationY);
    })
    .onEnd((e) => {
      const up = e.translationY < -SKIP_DISTANCE || e.velocityY < -SKIP_VELOCITY;
      const down = e.translationY > SKIP_DISTANCE || e.velocityY > SKIP_VELOCITY;
      if (candidate && up && hasNext) {
        const id = candidate.userId;
        translateY.set(
          withTiming(-step.value, { duration: 220 }, (finished) => {
            if (finished) {
              rolled.set(true);
              swapping.set(true);
              runOnJS(skip)(id);
            }
          })
        );
      } else if (down && backId !== undefined) {
        const id = backId;
        translateY.set(
          withTiming(step.value, { duration: 220 }, (finished) => {
            if (finished) {
              rolled.set(true);
              swapping.set(true);
              runOnJS(goBack)(id);
            }
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
          {/* The roll's frame: the neighbours wait one step above and below it, out of
              sight, and slide through as you drag. */}
          <View
            style={{ flex: 1, overflow: "hidden" }}
            onLayout={(e) => step.set(e.nativeEvent.layout.height + ROLL_GAP)}
          >
          {nextCandidate ? (
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, nextStyle]}
            >
              <DiscoverCardView person={nextCandidate} verificationStatus={undefined} />
            </Animated.View>
          ) : null}
          {previousCandidate ? (
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, previousStyle]}
            >
              <DiscoverCardView person={previousCandidate} verificationStatus={undefined} />
            </Animated.View>
          ) : null}
          <GestureDetector gesture={verticalSwipe}>
            <Animated.View style={[{ flex: 1 }, cardStyle]}>
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
