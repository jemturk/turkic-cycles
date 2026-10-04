import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useSession } from "@/hooks/useSession";
import { useDiscoverCandidates, useRecordSwipe } from "@/hooks/useDiscover";
import { useOtherUserVerificationStatus } from "@/hooks/useVerification";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";
import { DiscoverCardView } from "@/components/DiscoverCardView";
import { SwipeButton } from "@/components/SwipeButton";

// The one-at-a-time candidate card with pass / save / like, shared by a circle's
// "Meet members" screen (circleId) and the global Discover tab (circleId null).
// Renders as siblings (a fragment), so it fills whatever flex-1 container holds it.
export function DiscoverDeck({
  circleId,
  emptyLabel,
  onOpenProfile,
}: {
  circleId: string | null | undefined;
  emptyLabel: string;
  onOpenProfile: (userId: string) => void;
}) {
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: candidates, isLoading } = useDiscoverCandidates(circleId, userId);
  const recordSwipe = useRecordSwipe(circleId, userId);
  const [matchedName, setMatchedName] = useState<string | null>(null);

  const candidate = candidates?.[0];
  const { data: candidateVerification } = useOtherUserVerificationStatus(candidate?.userId);
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.userId]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

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
        // Inline style, not className: NativeWind classes on a Reanimated
        // Animated.View don't reliably apply (on web they're dropped), which left
        // this wrapper -- and so the card -- only as tall as the card's text
        // instead of filling the space above the buttons.
        <Animated.View style={[{ flex: 1, marginTop: 12 }, animatedStyle]}>
          <Pressable style={{ flex: 1 }} onPress={() => onOpenProfile(candidate.userId)}>
            <DiscoverCardView person={candidate} verificationStatus={candidateVerification} />
          </Pressable>

          <View className="mt-4 flex-row items-center justify-center gap-6">
            <SwipeButton action="pass" onPress={() => onSwipe("pass")} />
            <SwipeButton action="save" onPress={() => onSwipe("save")} />
            <SwipeButton action="like" onPress={() => onSwipe("like")} />
          </View>
        </Animated.View>
      )}

      <MatchCelebrationModal matchedName={matchedName} onDismiss={() => setMatchedName(null)} />
    </>
  );
}
