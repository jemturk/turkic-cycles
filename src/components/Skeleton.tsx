import { useEffect, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { CARD_SHADOW } from "@/theme/surfaces";

// Grey stand-ins for a screen's content while it loads, so a slow connection shows the
// shape of what's coming instead of a blank page. They breathe gently (not with reduced
// motion). The pulse is on an Animated.View with inline styles only; the colours sit on
// plain Views inside it, since NativeWind classes on Reanimated views drop on web.
export function SkeletonPulse({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [opacity, reduceMotion]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[style, pulse]}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Animated.View>
  );
}

// One placeholder shape.
export function Bone({ className = "", style }: { className?: string; style?: ViewStyle }) {
  return <View className={`bg-ink-100 dark:bg-ink-700 ${className}`} style={style} />;
}

// Discover's swipe deck: a card with its text band at the bottom, then the three
// buttons -- laid out like the real deck (DiscoverDeck), so nothing jumps when it loads.
export function DiscoverCardSkeleton() {
  return (
    <SkeletonPulse style={{ flex: 1, marginTop: 12 }}>
      <View className="flex-1 justify-end gap-3 rounded-3xl bg-ink-100/70 p-6 dark:bg-ink-800">
        <View className="flex-row items-center gap-2">
          <Bone className="h-10 w-10 rounded-full" />
          <Bone className="h-6 w-40 rounded-full" />
        </View>
        <Bone className="h-3.5 w-32 rounded-full" />
        <View className="flex-row gap-2">
          <Bone className="h-7 w-20 rounded-full" />
          <Bone className="h-7 w-24 rounded-full" />
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-center gap-6">
        <Bone className="h-14 w-14 rounded-full" />
        <Bone className="h-14 w-14 rounded-full" />
        <Bone className="h-14 w-14 rounded-full" />
      </View>
    </SkeletonPulse>
  );
}

// A grouped list of rows -- avatar, name and a line under it -- like Chats. bare: the
// rows alone, without the card (desktop's conversation pane).
export function RowsSkeleton({ rows = 5, avatar = 52, bare = false }: { rows?: number; avatar?: number; bare?: boolean }) {
  const list = Array.from({ length: rows }, (_, index) => (
    <View
      key={index}
      className={`flex-row items-center gap-3 ${bare ? "p-3" : "px-4 py-3"} ${
        index > 0 && !bare ? "border-t border-[#F3E3D2] dark:border-ink-700" : ""
      }`}
    >
      <Bone className="rounded-full" style={{ width: avatar, height: avatar }} />
      <View className="flex-1 gap-2">
        <Bone className="h-4 w-1/3 rounded-full" />
        <Bone className="h-3 w-2/3 rounded-full" />
      </View>
    </View>
  ));
  return (
    <SkeletonPulse>
      {bare ? (
        list
      ) : (
        <View className="rounded-[22px]" style={CARD_SHADOW}>
          <View className="overflow-hidden rounded-[22px] bg-white dark:bg-ink-800">{list}</View>
        </View>
      )}
    </SkeletonPulse>
  );
}

// A wrapping grid of cards (Connections, Discover's desktop grid, Circles).
export function GridSkeleton({
  count = 4,
  width,
  height = width,
  gap = 12,
}: {
  count?: number;
  width: number;
  height?: number;
  gap?: number;
}) {
  if (width <= 0) return null;
  return (
    <SkeletonPulse style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className="rounded-[22px]" style={[{ width, height }, CARD_SHADOW]}>
          <View className="flex-1 items-center justify-center gap-2 rounded-[22px] bg-white p-3 dark:bg-ink-800">
            <Bone className="h-14 w-14 rounded-full" />
            <Bone className="h-3.5 w-2/3 rounded-full" />
            <Bone className="h-3 w-1/2 rounded-full" />
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
}

// One Settings-style group: an optional small title, then a card of icon-tile rows.
export function GroupSkeleton({ rows, title = true }: { rows: number; title?: boolean }) {
  return (
    <View className="gap-1.5">
      {title ? <Bone className="ml-1 mt-1 h-3 w-24 rounded-full" /> : null}
      <View className="rounded-[22px]" style={CARD_SHADOW}>
        <View className="overflow-hidden rounded-[22px] bg-white dark:bg-ink-800">
          {Array.from({ length: rows }, (_, index) => (
            <View
              key={index}
              className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? "border-t border-[#F3E3D2] dark:border-ink-700" : ""}`}
            >
              <Bone className="h-9 w-9 rounded-lg" />
              <Bone className="h-4 rounded-full" style={{ width: `${45 + ((index * 17) % 30)}%` }} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// Settings: your profile row, then groups of rows. columns: desktop's two columns.
export function SettingsSkeleton({ columns = 1 }: { columns?: 1 | 2 }) {
  const profile = (
    <View className="rounded-[22px]" style={CARD_SHADOW}>
      <View className="flex-row items-center gap-3 rounded-[22px] bg-white px-4 py-3 dark:bg-ink-800">
        <Bone className="h-11 w-11 rounded-full" />
        <View className="flex-1 gap-2">
          <Bone className="h-4 w-1/3 rounded-full" />
          <Bone className="h-3 w-1/2 rounded-full" />
        </View>
      </View>
    </View>
  );
  if (columns === 2) {
    return (
      <SkeletonPulse style={{ flexDirection: "row", alignItems: "flex-start", gap: 24 }}>
        <View className="flex-1 gap-4">
          {profile}
          <GroupSkeleton rows={3} />
          <GroupSkeleton rows={2} />
        </View>
        <View className="flex-1 gap-4">
          <GroupSkeleton rows={3} />
          <GroupSkeleton rows={4} />
        </View>
      </SkeletonPulse>
    );
  }
  return (
    <SkeletonPulse style={{ gap: 12 }}>
      {profile}
      <GroupSkeleton rows={3} />
      <GroupSkeleton rows={2} />
      <GroupSkeleton rows={4} />
    </SkeletonPulse>
  );
}

// A form in white cards (Edit profile): each a label over a field, a few to a card.
export function FormSkeleton({ cards = [3, 1, 2, 2] }: { cards?: number[] }) {
  return (
    <SkeletonPulse style={{ gap: 16 }}>
      {cards.map((fields, card) => (
        <View key={card} className="gap-4 rounded-[22px] bg-white p-5 dark:bg-ink-800" style={CARD_SHADOW}>
          {Array.from({ length: fields }, (_, index) => (
            <View key={index} className="gap-2">
              <Bone className="h-3.5 w-28 rounded-full" />
              <Bone className="h-12 w-full rounded-xl" />
            </View>
          ))}
        </View>
      ))}
    </SkeletonPulse>
  );
}

// A profile (yours or someone's): the picture, name and details, then cards of text.
export function ProfileSkeleton() {
  return (
    <SkeletonPulse style={{ gap: 16 }}>
      <View className="items-center gap-2">
        <Bone className="h-[88px] w-[88px] rounded-full" />
        <Bone className="mt-2 h-6 w-40 rounded-full" />
        <Bone className="h-3.5 w-28 rounded-full" />
      </View>
      <View className="gap-3 rounded-[22px] bg-white p-5 dark:bg-ink-800" style={CARD_SHADOW}>
        <Bone className="h-3.5 w-full rounded-full" />
        <Bone className="h-3.5 w-11/12 rounded-full" />
        <Bone className="h-3.5 w-2/3 rounded-full" />
      </View>
      <View className="gap-3 rounded-[22px] bg-white p-5 dark:bg-ink-800" style={CARD_SHADOW}>
        <Bone className="h-3.5 w-28 rounded-full" />
        <View className="flex-row flex-wrap gap-2">
          <Bone className="h-8 w-20 rounded-full" />
          <Bone className="h-8 w-24 rounded-full" />
          <Bone className="h-8 w-16 rounded-full" />
        </View>
      </View>
    </SkeletonPulse>
  );
}

// A white card of a few text lines.
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <View className="gap-3 rounded-[22px] bg-white p-5 dark:bg-ink-800" style={CARD_SHADOW}>
      {Array.from({ length: lines }, (_, index) => (
        <Bone key={index} className="h-3.5 rounded-full" style={{ width: index === lines - 1 ? "60%" : "100%" }} />
      ))}
    </View>
  );
}

// A Settings sub-page's content (SubPage's loading): a card, then a group of rows.
export function SubPageSkeleton() {
  return (
    <SkeletonPulse style={{ gap: 16 }}>
      <CardSkeleton />
      <GroupSkeleton rows={3} title={false} />
    </SkeletonPulse>
  );
}

// A conversation's messages: bubbles down alternate sides.
const BUBBLES: { own: boolean; width: string }[] = [
  { own: false, width: "55%" },
  { own: false, width: "38%" },
  { own: true, width: "48%" },
  { own: false, width: "62%" },
  { own: true, width: "34%" },
  { own: true, width: "52%" },
];
export function MessagesSkeleton() {
  return (
    <SkeletonPulse style={{ gap: 12 }}>
      {BUBBLES.map((bubble, index) => (
        <Bone
          key={index}
          className={`h-10 rounded-2xl ${bubble.own ? "self-end" : "self-start"}`}
          style={{ width: bubble.width as `${number}%` }}
        />
      ))}
    </SkeletonPulse>
  );
}
