import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, View, type AccessibilityActionEvent, type AccessibilityActionInfo } from "react-native";
import { Text } from "@/components/Text";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useSession } from "@/hooks/useSession";
import { useDiscoverCandidates, useRecordSwipe } from "@/hooks/useDiscover";
import type { DiscoverCandidate } from "@/api/discover";
import { useOtherUserVerificationStatus } from "@/hooks/useVerification";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";
import { DiscoverCardView } from "@/components/DiscoverCardView";
import { SwipeButton } from "@/components/SwipeButton";
import { DiscoverGrid } from "@/components/DiscoverGrid";
import { moveTo, reconcile, type Roll } from "@/lib/discoverRoll";
import { loadRecentlySkipped, rememberSkip, skippedLast } from "@/lib/skipCooldown";
import { useWideLayout } from "@/hooks/useWideLayout";

// How far (points) or how fast (points/second) a vertical swipe has to go to count
// -- up to skip, down to go back; anything less springs the card back.
const SKIP_DISTANCE = 120;
const SKIP_VELOCITY = 900;
// The space between cards on the roll, seen while one slides in.
const ROLL_GAP = 16;
// How far or fast a sideways swipe has to go to like (right) or pass (left), and
// how far the card flies off.
const ANSWER_DISTANCE = 110;
const ANSWER_VELOCITY = 800;
const FLY_OFF = 600;
// Remembers, on this device, that the first-visit gesture hint has been seen.
const HINT_SEEN_KEY = "discover.gestureHintSeen";
// How far a drag goes before its direction (roll or like / pass) is decided.
const AXIS_DECIDE_DISTANCE = 8;

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
//
// The card in front (front === index) also follows a sideways swipe (swipeX), tilting
// a little, with a heart or a cross fading in to show what letting go will do.
function RollCard({
  index,
  base,
  drag,
  step,
  front,
  swipeX,
  swipeDown,
  children,
}: {
  index: number;
  base: SharedValue<number>;
  drag: SharedValue<number>;
  step: SharedValue<number>;
  front: SharedValue<number>;
  swipeX: SharedValue<number>;
  swipeDown: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const x = front.value === index ? swipeX.value : 0;
    // A save slides the card in front straight down, on its own (not the roll's drag,
    // which would pull the previous person in from above).
    const down = front.value === index ? swipeDown.value : 0;
    return {
      transform: [
        { translateY: index * step.value - base.value + drag.value + down },
        { translateX: x },
        { rotate: `${x / 25}deg` },
      ],
    };
  });
  const likeStyle = useAnimatedStyle(() => ({
    opacity: front.value === index ? interpolate(swipeX.value, [0, ANSWER_DISTANCE], [0, 1], "clamp") : 0,
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: front.value === index ? interpolate(swipeX.value, [-ANSWER_DISTANCE, 0], [1, 0], "clamp") : 0,
  }));
  return (
    <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, style]}>
      {children}
      {/* Both in the middle of the card; only the one for the swipe's direction shows. */}
      <Animated.View pointerEvents="none" style={[BADGE, { backgroundColor: "#C1440E" }, likeStyle]}>
        <Ionicons name="heart" size={38} color="#FFFFFF" />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[BADGE, { backgroundColor: "#FBE9E1" }, passStyle]}>
        <Ionicons name="close" size={44} color="#C1440E" />
      </Animated.View>
    </Animated.View>
  );
}

// The like / pass badges on the card, in the buttons' colors (SwipeButton).
// The stamp: popping in, holding, fading out. About half a second in all.
const STAMP_IN_MS = 120;
const STAMP_HOLD_MS = 180;
const STAMP_OUT_MS = 220;
const STAMP_MS = STAMP_IN_MS + STAMP_HOLD_MS + STAMP_OUT_MS;
// How long a liked or passed card takes to fly off.
const FLY_MS = 260;
// The next person fading in after an answer.
const NEXT_FADE_MS = 350;

const BADGE_SIZE = 80;
// The stamp a like / pass leaves in the middle (SwipeDeck), a size up from the badge.
const STAMP = {
  position: "absolute",
  width: 96,
  height: 96,
  borderRadius: 48,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 6,
} as const;
const BADGE = {
  position: "absolute",
  top: "50%",
  left: "50%",
  marginTop: -BADGE_SIZE / 2,
  marginLeft: -BADGE_SIZE / 2,
  width: BADGE_SIZE,
  height: BADGE_SIZE,
  borderRadius: BADGE_SIZE / 2,
  alignItems: "center",
  justifyContent: "center",
} as const;

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
  // Everyone this visit has been sent, in arrival order. The global deck's list is a
  // fresh random sample on every fetch (one follows each answer), so someone missing
  // from the latest sample hasn't gone -- they just weren't drawn this time. A fetch
  // only adds people; answering is what takes them off.
  const [pool, setPool] = useState<DiscoverCandidate[]>([]);
  const fetchedKey = (candidates ?? []).map((c) => c.userId).join(",");
  const [poolKey, setPoolKey] = useState<string | null>(null);
  if (poolKey !== fetchedKey) {
    setPoolKey(fetchedKey);
    const inPool = new Set(pool.map((c) => c.userId));
    const fresh = (candidates ?? []).filter((c) => !inPool.has(c.userId));
    // Newer details for people already here (a changed photo, say), newcomers after.
    const latest = new Map((candidates ?? []).map((c) => [c.userId, c]));
    setPool([...pool.map((c) => latest.get(c.userId) ?? c), ...fresh]);
  }
  // People just liked / passed / saved here, taken off at once rather than when the
  // server's fresh list arrives -- otherwise a swiped-away card leaves a gap.
  const [answered, setAnswered] = useState<ReadonlySet<string>>(() => new Set());
  // The first-visit hint: shown until the first swipe, answer or close, once per device.
  const [showHint, setShowHint] = useState(false);
  // People skipped in the last day, on this device (skipCooldown.ts): they go to the back
  // of the line rather than straight back in front. null while it's being read, so the
  // line isn't built in the wrong order first.
  const [recentlySkipped, setRecentlySkipped] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadRecentlySkipped().then((skipped) => {
      if (!cancelled) setRecentlySkipped(skipped);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const shown = recentlySkipped
    ? skippedLast(
        pool.filter((c) => !answered.has(c.userId)),
        recentlySkipped
      )
    : [];

  // Who's shown changes underneath (the first load, newcomers in a fresh batch,
  // someone liked / passed / saved): people answered leave the roll, newcomers join
  // its end. Adjusted while rendering, React's pattern for state that follows props.
  const candidateKey = shown.map((c) => c.userId).join(",");
  // null: nothing seen yet, so the first list (even one already cached) fills the roll.
  const [rollKey, setRollKey] = useState<string | null>(null);
  if (rollKey !== candidateKey) {
    setRollKey(candidateKey);
    setRoll(reconcile(roll, shown));
  }

  const byId = new Map(shown.map((c) => [c.userId, c]));
  const candidate = byId.get(roll.ids[roll.pos] ?? "");
  const canGoBack = roll.pos > 0;
  const hasNext = roll.pos < roll.ids.length - 1;

  // The roll's position in points: base = where the person in front sits, drag = the
  // finger. step = one card's height plus the gap, measured.
  const base = useSharedValue(0);
  const drag = useSharedValue(0);
  const step = useSharedValue(0);
  const opacity = useSharedValue(1);
  // Which index is in front (kept in step with base), and the sideways swipe.
  const front = useSharedValue(0);
  const swipeX = useSharedValue(0);
  const swipeDown = useSharedValue(0);
  // A drag's direction, decided by its first movement: 0 not yet, 1 up/down (roll),
  // 2 sideways (like / pass).
  const axis = useSharedValue(0);
  // The like / pass buttons' scale, pulsed when a swipe answers.
  const likePulse = useSharedValue(1);
  const passPulse = useSharedValue(1);
  const likePulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: likePulse.value }] }));
  const passPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: passPulse.value }] }));
  const savePulse = useSharedValue(1);
  const savePulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: savePulse.value }] }));
  // Pops a button up and springs it back: after a swipe, and when it's tapped.
  function pulse(button: SharedValue<number>) {
    "worklet";
    button.set(withSequence(withTiming(1.18, { duration: 130 }), withSpring(1, { damping: 9, stiffness: 220 })));
  }
  // The stamp left in the middle when someone is liked (1), passed (-1) or saved (0): it pops up
  // where the eyes are while the card flies off, holds a moment, and fades.
  const stampKind = useSharedValue(1);
  const stampScale = useSharedValue(1);
  const stampOpacity = useSharedValue(0);
  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: stampKind.value === 1 ? stampOpacity.value : 0,
    transform: [{ scale: stampScale.value }],
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity: stampKind.value === -1 ? stampOpacity.value : 0,
    transform: [{ scale: stampScale.value }],
  }));
  const saveStampStyle = useAnimatedStyle(() => ({
    opacity: stampKind.value === 0 ? stampOpacity.value : 0,
    transform: [{ scale: stampScale.value }],
  }));
  // First visit: a pill says what the gestures do, and the card nudges up once to show
  // there's someone waiting below.
  const hasCard = roll.ids.length > 0;
  useEffect(() => {
    if (!hasCard) return;
    let cancelled = false;
    AsyncStorage.getItem(HINT_SEEN_KEY)
      .then((seen) => {
        if (cancelled || seen) return;
        setShowHint(true);
        drag.set(withDelay(700, withSequence(withTiming(-36, { duration: 320 }), withSpring(0, { damping: 12 }))));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCard]);

  function dismissHint() {
    if (!showHint) return;
    setShowHint(false);
    AsyncStorage.setItem(HINT_SEEN_KEY, "1").catch(() => {});
  }

  function showStamp(kind: 1 | -1 | 0) {
    "worklet";
    stampKind.set(kind);
    stampScale.set(0.6);
    stampScale.set(withSequence(withTiming(1.15, { duration: STAMP_IN_MS + 40 }), withSpring(1, { damping: 10, stiffness: 200 })));
    // In, a short hold, out: gone before the next person appears (see the fade below).
    stampOpacity.set(
      withSequence(
        withTiming(1, { duration: STAMP_IN_MS }),
        withDelay(STAMP_HOLD_MS, withTiming(0, { duration: STAMP_OUT_MS }))
      )
    );
  }

  // Puts the animation where the roll is after a change the gesture didn't make; the
  // next person fades in when the one in front left.
  useLayoutEffect(() => {
    if (!roll.resync) return;
    base.set(roll.pos * step.get());
    front.set(roll.pos);
    drag.set(0);
    if (roll.fade) {
      // After a like / pass / save the next person waits for the stamp to finish, so it
      // never sits on them as if they were the one answered. The stamp starts as the
      // card takes off and this runs as it lands, so what's left is the stamp less the
      // flight. (No stamp showing -- a screen reader's action, say -- no wait.)
      const wait = stampOpacity.get() > 0 ? Math.max(0, STAMP_MS - FLY_MS) : 0;
      opacity.set(0);
      opacity.set(withDelay(wait, withTiming(1, { duration: NEXT_FADE_MS })));
      // The next person takes the front place: not where the last one flew off to.
      swipeX.set(0);
      swipeDown.set(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll]);

  // Moves the roll by one without animating (screen readers' skip / back actions).
  function jump(delta: 1 | -1) {
    if (delta === 1 && candidate) rememberSkip(candidate.userId);
    setRoll((current) => ({ ...moveTo(current, current.pos + delta), resync: true }));
  }

  // After the roll has landed on the UI thread (base already moved): just record it.
  function landed(delta: 1 | -1) {
    // Rolling on past someone is a skip: remembered for a day (skipCooldown.ts).
    if (delta === 1 && candidate) rememberSkip(candidate.userId);
    setRoll((current) => moveTo(current, current.pos + delta));
  }

  // One drag, its direction set by its first movement (12pt): up or down rolls,
  // sideways likes (right) or passes (left). A tap still opens the profile. With no
  // one to roll to in that direction, the drag only stretches a little and springs back.
  const swipe = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .activeOffsetX([-12, 12])
    .onStart(() => {
      axis.set(0);
      runOnJS(dismissHint)();
    })
    .onUpdate((e) => {
      if (axis.value === 0) {
        const dx = Math.abs(e.translationX);
        const dy = Math.abs(e.translationY);
        // Decide only once the finger has really moved: Android's first update can
        // report no movement yet, which read as "not sideways" and made every drag
        // a roll.
        if (Math.max(dx, dy) < AXIS_DECIDE_DISTANCE) return;
        axis.set(dx > dy ? 2 : 1);
      }
      if (axis.value === 2) {
        swipeX.set(e.translationX);
        return;
      }
      const blocked = e.translationY > 0 ? !canGoBack : !hasNext;
      // .set() rather than assigning .value: same effect, and it's the form the
      // React Compiler lint accepts for Reanimated shared values.
      drag.set(blocked ? e.translationY * 0.2 : e.translationY);
    })
    .onEnd((e) => {
      if (axis.value === 2) {
        const like = e.translationX > ANSWER_DISTANCE || e.velocityX > ANSWER_VELOCITY;
        const pass = e.translationX < -ANSWER_DISTANCE || e.velocityX < -ANSWER_VELOCITY;
        if (!like && !pass) {
          swipeX.set(withSpring(0));
          return;
        }
        swipeX.set(
          withTiming(like ? FLY_OFF : -FLY_OFF, { duration: FLY_MS }, (finished) => {
            if (finished) runOnJS(answer)(like ? "like" : "pass");
          })
        );
        // The matching button below pulses, so even a quick flick reads as "liked" or
        // "passed" -- the button you'd have pressed.
        showStamp(like ? 1 : -1);
        pulse(like ? likePulse : passPulse);
        return;
      }
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
          front.set(front.value + delta);
          drag.set(0);
          runOnJS(landed)(delta);
        })
      );
    });

  // Records the answer for the person in front and takes them off at once; if it
  // fails, they come back.
  function answer(action: "like" | "pass" | "save") {
    if (!candidate) return;
    dismissHint();
    const person = candidate;
    setAnswered((current) => new Set(current).add(person.userId));
    recordSwipe.mutate(
      { targetId: person.userId, action },
      {
        onSuccess: (isMatch) => {
          if (isMatch) setMatchedName(person.displayName);
        },
        onError: () => {
          setAnswered((current) => {
            const next = new Set(current);
            next.delete(person.userId);
            return next;
          });
        },
      }
    );
  }

  // The like / pass buttons fly the card off the same way a swipe does; save slides it
  // down. Each with its button's pulse and stamp.
  function onButton(action: "like" | "pass" | "save") {
    pulse(action === "like" ? likePulse : action === "pass" ? passPulse : savePulse);
    if (action === "save") {
      showStamp(0);
      swipeDown.set(
        withTiming(FLY_OFF, { duration: FLY_MS }, (finished) => {
          if (finished) runOnJS(answer)("save");
        })
      );
      return;
    }
    showStamp(action === "like" ? 1 : -1);
    swipeX.set(
      withTiming(action === "like" ? FLY_OFF : -FLY_OFF, { duration: FLY_MS }, (finished) => {
        if (finished) runOnJS(answer)(action);
      })
    );
  }

  // The person in front and their neighbours on the roll; the rest aren't drawn.
  const visible = [roll.pos - 1, roll.pos, roll.pos + 1].filter((i) => i >= 0 && i < roll.ids.length);
  const frameStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      {isLoading || recentlySkipped === null ? null : !candidate ? (
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
          <View style={{ flex: 1 }}>
          <GestureDetector gesture={swipe}>
            <Animated.View
              style={[{ flex: 1, overflow: "hidden" }, frameStyle]}
              onLayout={(e) => {
                const height = e.nativeEvent.layout.height + ROLL_GAP;
                step.set(height);
                base.set(roll.pos * height);
                front.set(roll.pos);
              }}
            >
              {visible.map((index) => {
                const person = byId.get(roll.ids[index]);
                if (!person) return null;
                return (
                  <RollCard
                    key={index}
                    index={index}
                    base={base}
                    drag={drag}
                    step={step}
                    front={front}
                    swipeX={swipeX}
                    swipeDown={swipeDown}
                  >
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
          {showHint ? (
            <View pointerEvents="box-none" style={{ position: "absolute", top: 14, left: 14, right: 14, alignItems: "center" }}>
              <View
                accessibilityRole="alert"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(43,35,32,0.82)",
                  borderRadius: 999,
                  paddingLeft: 14,
                  paddingRight: 4,
                  paddingVertical: 4,
                }}
              >
                <Ionicons name="swap-vertical" size={16} color="#FFFFFF" />
                <Text className="shrink text-sm font-medium" style={{ color: "#FFFFFF" }}>
                  {t("discover.gestureHint")}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("chat.dismissTip")}
                  hitSlop={8}
                  onPress={dismissHint}
                  className="h-8 w-8 items-center justify-center rounded-full"
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          ) : null}
          {/* The like / pass stamp, over the cards but outside their frame, so it stays
              while the next person fades in. */}
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}
          >
            <Animated.View style={[STAMP, { backgroundColor: "#C1440E" }, likeStampStyle]}>
              <Ionicons name="heart" size={46} color="#FFFFFF" />
            </Animated.View>
            <Animated.View style={[STAMP, { backgroundColor: "#FBE9E1" }, passStampStyle]}>
              <Ionicons name="close" size={52} color="#C1440E" />
            </Animated.View>
            <Animated.View style={[STAMP, { backgroundColor: "#FFFFFF" }, saveStampStyle]}>
              <Ionicons name="star" size={46} color="#D9663D" />
            </Animated.View>
          </View>
          </View>

          <View className="mt-4 flex-row items-center justify-center gap-6">
            <Animated.View style={passPulseStyle}>
              <SwipeButton action="pass" onPress={() => onButton("pass")} />
            </Animated.View>
            <Animated.View style={savePulseStyle}>
              <SwipeButton action="save" onPress={() => onButton("save")} />
            </Animated.View>
            <Animated.View style={likePulseStyle}>
              <SwipeButton action="like" onPress={() => onButton("like")} />
            </Animated.View>
          </View>
        </View>
      )}

      <MatchCelebrationModal matchedName={matchedName} onDismiss={() => setMatchedName(null)} />
    </>
  );
}
