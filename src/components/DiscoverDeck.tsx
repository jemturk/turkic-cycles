import { useLayoutEffect, useState, type ReactNode } from "react";
import { Pressable, View, type AccessibilityActionEvent, type AccessibilityActionInfo } from "react-native";
import { Text } from "@/components/Text";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useDiscoverCandidates, useRecordSwipe } from "@/hooks/useDiscover";
import type { DiscoverCandidate } from "@/api/discover";
import { useOtherUserVerificationStatus } from "@/hooks/useVerification";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";
import { DiscoverCardView } from "@/components/DiscoverCardView";
import { SwipeButton } from "@/components/SwipeButton";
import { DiscoverGrid } from "@/components/DiscoverGrid";
import { moveTo, reconcile, type Roll } from "@/lib/discoverRoll";
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

// One card at a fixed place on the roll: `index` steps from the start. The roll
// moves (base minus the drag), never the cards' places, so landing on a new person
// changes nothing on screen -- that was the flicker when cards swapped people.
function RollCard({
  index,
  base,
  drag,
  step,
  children,
}: {
  index: number;
  base: SharedValue<number>;
  drag: SharedValue<number>;
  step: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: index * step.value - base.value + drag.value }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, style]}>
      {children}
    </Animated.View>
  );
}

// What a card on the roll shows. The same tree in front and as a neighbour -- only
// props change when it lands -- so its photo isn't torn down and reloaded (on iOS a
// remounted Image shows blank for a moment: the flicker on landing). It loads its own
// verification badge too, so that's ready before it lands rather than popping in.
function RollFace({
  person,
  inFront,
  onPress,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
}: {
  person: DiscoverCandidate;
  inFront: boolean;
  onPress: () => void;
  accessibilityHint: string;
  accessibilityActions: AccessibilityActionInfo[];
  onAccessibilityAction: (e: AccessibilityActionEvent) => void;
}) {
  const { data: verification } = useOtherUserVerificationStatus(person.userId);
  return (
    <Pressable
      style={{ flex: 1 }}
      // A neighbour is decoration until it's in front: not tappable, hidden from
      // screen readers.
      disabled={!inFront}
      pointerEvents={inFront ? "auto" : "none"}
      accessibilityElementsHidden={!inFront}
      importantForAccessibility={inFront ? "auto" : "no-hide-descendants"}
      onPress={onPress}
      accessibilityHint={inFront ? accessibilityHint : undefined}
      accessibilityActions={inFront ? accessibilityActions : undefined}
      onAccessibilityAction={inFront ? onAccessibilityAction : undefined}
    >
      <DiscoverCardView person={person} verificationStatus={verification} />
    </Pressable>
  );
}

function SwipeDeck({ circleId, emptyLabel, onOpenProfile }: DiscoverDeckProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: candidates, isLoading } = useDiscoverCandidates(circleId, userId);
  const recordSwipe = useRecordSwipe(circleId, userId);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [roll, setRoll] = useState<Roll>({ ids: [], pos: 0 });

  // The candidate list changes underneath (the first load, a fresh batch, someone
  // liked / passed / saved): people no longer in it leave the roll, newcomers join
  // its end. Adjusted while rendering, React's pattern for state that follows props.
  const candidateKey = (candidates ?? []).map((c) => c.userId).join(",");
  // null: nothing seen yet, so the first list (even one already cached) fills the roll.
  const [rollKey, setRollKey] = useState<string | null>(null);
  if (rollKey !== candidateKey) {
    setRollKey(candidateKey);
    setRoll(reconcile(roll, candidates ?? []));
  }

  const byId = new Map((candidates ?? []).map((c) => [c.userId, c]));
  const candidate = byId.get(roll.ids[roll.pos] ?? "");
  const canGoBack = roll.pos > 0;
  const hasNext = roll.pos < roll.ids.length - 1;

  // The roll's position in points: base = where the person in front sits, drag = the
  // finger. step = one card's height plus the gap, measured.
  const base = useSharedValue(0);
  const drag = useSharedValue(0);
  const step = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Puts the animation where the roll is after a change the gesture didn't make; the
  // next person fades in when the one in front left.
  useLayoutEffect(() => {
    if (!roll.resync) return;
    base.set(roll.pos * step.get());
    drag.set(0);
    if (roll.fade) {
      opacity.set(0);
      opacity.set(withTiming(1, { duration: 250 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll]);

  // Moves the roll by one without animating (screen readers' skip / back actions).
  function jump(delta: 1 | -1) {
    setRoll((current) => ({ ...moveTo(current, current.pos + delta), resync: true }));
  }

  // After the roll has landed on the UI thread (base already moved): just record it.
  function landed(delta: 1 | -1) {
    setRoll((current) => moveTo(current, current.pos + delta));
  }

  // Vertical only: it activates after 12pt of up or down movement and gives way to
  // sideways movement, so a tap still opens the profile. With no one to roll to in
  // that direction, the drag only stretches a little and springs back.
  const verticalSwipe = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      const blocked = e.translationY > 0 ? !canGoBack : !hasNext;
      // .set() rather than assigning .value: same effect, and it's the form the
      // React Compiler lint accepts for Reanimated shared values.
      drag.set(blocked ? e.translationY * 0.2 : e.translationY);
    })
    .onEnd((e) => {
      const up = e.translationY < -SKIP_DISTANCE || e.velocityY < -SKIP_VELOCITY;
      const down = e.translationY > SKIP_DISTANCE || e.velocityY > SKIP_VELOCITY;
      const delta = up && hasNext ? 1 : down && canGoBack ? -1 : 0;
      if (delta === 0) {
        drag.set(withSpring(0));
        return;
      }
      drag.set(
        withTiming(-delta * step.value, { duration: 220 }, (finished) => {
          if (!finished) return;
          // In one frame: the roll's base moves on and the drag resets, so nothing
          // on screen moves; React then only learns who's in front.
          base.set(base.value + delta * step.value);
          drag.set(0);
          runOnJS(landed)(delta);
        })
      );
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

  // The person in front and their neighbours on the roll; the rest aren't drawn.
  const visible = [roll.pos - 1, roll.pos, roll.pos + 1].filter((i) => i >= 0 && i < roll.ids.length);
  const frameStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      {isLoading ? null : !candidate ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base text-ink-700 dark:text-ink-200">{emptyLabel}</Text>
        </View>
      ) : (
        // The cards fill the space above the buttons (flex: 1). Animated views take
        // inline styles, not className: NativeWind classes on Reanimated views don't
        // reliably apply (on web they're dropped), which once left the card only as
        // tall as its text.
        <View style={{ flex: 1, marginTop: 12 }}>
          {/* The roll's frame: the neighbours wait one step above and below, out of
              sight, and slide through as you drag. Only the cards move: the buttons
              below stay put. */}
          <GestureDetector gesture={verticalSwipe}>
            <Animated.View
              style={[{ flex: 1, overflow: "hidden" }, frameStyle]}
              onLayout={(e) => {
                const height = e.nativeEvent.layout.height + ROLL_GAP;
                step.set(height);
                base.set(roll.pos * height);
              }}
            >
              {visible.map((index) => {
                const person = byId.get(roll.ids[index]);
                if (!person) return null;
                return (
                  <RollCard key={index} index={index} base={base} drag={drag} step={step}>
                    <RollFace
                      person={person}
                      inFront={index === roll.pos}
                      onPress={() => onOpenProfile(person.userId)}
                      accessibilityHint={t("discover.swipeUpHint")}
                      // Screen readers can't swipe the card, so skip and back are actions too.
                      accessibilityActions={[
                        ...(hasNext ? [{ name: "skip", label: t("discover.skip") }] : []),
                        ...(canGoBack ? [{ name: "back", label: t("discover.previous") }] : []),
                      ]}
                      onAccessibilityAction={(e) => {
                        if (e.nativeEvent.actionName === "skip" && hasNext) jump(1);
                        if (e.nativeEvent.actionName === "back" && canGoBack) jump(-1);
                      }}
                    />
                  </RollCard>
                );
              })}
            </Animated.View>
          </GestureDetector>

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
