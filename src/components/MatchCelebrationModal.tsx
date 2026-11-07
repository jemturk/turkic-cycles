import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { haptic } from "@/lib/haptics";

export type MatchedPerson = { name: string; avatarUrl?: string | null };

type MatchCelebrationModalProps = {
  matched: MatchedPerson | null;
  onDismiss: () => void;
};

const AVATAR = 88;

// A real overlay View rather than RN's Alert.alert: Alert is a no-op on web
// (react-native-web doesn't implement it), and this needs to be visible and
// testable on every platform this app targets, web included.
//
// Your picture and theirs side by side, a heart where they meet; the card springs in
// over a fading backdrop (a plain fade with reduced motion), with a success buzz.
// Animated views take inline styles only; the colours sit on plain Views inside.
export function MatchCelebrationModal({ matched, onDismiss }: MatchCelebrationModalProps) {
  const { t } = useTranslation();
  const { session } = useSession();
  const { data: me } = useMyProfile(session?.user.id);
  const reduceMotion = useReducedMotion();
  const backdrop = useSharedValue(0);
  const scale = useSharedValue(0.85);

  const open = !!matched;
  useEffect(() => {
    if (!open) return;
    haptic("success");
    backdrop.set(0);
    scale.set(reduceMotion ? 1 : 0.85);
    backdrop.set(withTiming(1, { duration: 180 }));
    if (!reduceMotion) scale.set(withSpring(1, { damping: 12, stiffness: 180 }));
  }, [open, backdrop, scale, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: backdrop.value, transform: [{ scale: scale.value }] }));

  if (!matched) return null;

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, backdropStyle]}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <Animated.View style={[{ width: "100%", maxWidth: 400 }, cardStyle]}>
          <View className="w-full items-center gap-4 rounded-[22px] bg-white p-6 pt-8 dark:bg-ink-800">
            <View className="flex-row items-center">
              <View className="rounded-full border-4 border-white dark:border-ink-800" style={{ transform: [{ rotate: "-6deg" }] }}>
                <Avatar uri={me?.avatar_url} name={me?.display_name} size={AVATAR} />
              </View>
              <View className="-ml-5 rounded-full border-4 border-white dark:border-ink-800" style={{ transform: [{ rotate: "6deg" }] }}>
                <Avatar uri={matched.avatarUrl} name={matched.name} size={AVATAR} />
              </View>
              {/* Where the two pictures meet. */}
              <View
                className="absolute h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-accent-500 dark:border-ink-800"
                // Centred on the overlap: each picture is AVATAR + its 4px border either side, the second pulled 20 left.
                style={{ left: AVATAR + 8 - 10 - 20, bottom: -6 }}
              >
                <Ionicons name="heart" size={16} color="#FFFFFF" />
              </View>
            </View>
            <Text className="mt-2 font-display text-3xl text-primary-500 dark:text-primary-400">{t("discover.itsAMatch")}</Text>
            <Text className="text-center text-base text-ink-700 dark:text-ink-200">
              {t("discover.bothLiked", { name: matched.name })}
            </Text>
            <Button label={t("discover.keepExploring")} onPress={onDismiss} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
