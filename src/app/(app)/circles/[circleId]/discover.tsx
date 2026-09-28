import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useSession } from "@/hooks/useSession";
import { useDiscoverCandidates, useRecordSwipe } from "@/hooks/useDiscover";
import { useOtherUserVerificationStatus } from "@/hooks/useVerification";
import { calculateAge } from "@/lib/age";
import { CONNECTION_TYPE_LABELS } from "@/constants/connectionTypes";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export default function Discover() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
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
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-1 px-6 pt-6">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <Text className="mt-4 font-display text-2xl text-ink-900 dark:text-ink-50">Discover</Text>

        {isLoading ? null : !candidate ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-base text-ink-700 dark:text-ink-200">No one new to discover right now.</Text>
          </View>
        ) : (
          <Animated.View style={animatedStyle} className="mt-4 flex-1">
            <Pressable
              className="flex-1 justify-end rounded-3xl bg-teal-500 p-6"
              onPress={() => router.push(`/(app)/profile/${candidate.userId}?circleId=${circleId}&fromDiscover=true`)}
            >
              <View className="mb-8 items-center">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-white/30">
                  <Text className="text-4xl font-semibold text-white">
                    {candidate.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="font-display text-2xl text-white">
                    {candidate.displayName}
                    {candidate.birthdate ? `, ${calculateAge(candidate.birthdate)}` : ""}
                  </Text>
                  <VerifiedBadge status={candidateVerification} color="white" />
                </View>
                <Text className="text-sm text-white/90">
                  {[candidate.city, candidate.state].filter(Boolean).join(", ")}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {candidate.occupation ? (
                    <View className="rounded-full bg-white/20 px-3 py-1">
                      <Text className="text-xs font-medium text-white">{candidate.occupation}</Text>
                    </View>
                  ) : null}
                  {candidate.originCountries.map((country) => (
                    <View key={country} className="rounded-full bg-white/20 px-3 py-1">
                      <Text className="text-xs font-medium text-white">{country}</Text>
                    </View>
                  ))}
                  {candidate.connectionTypes.map((type) => (
                    <View key={type} className="rounded-full bg-white/20 px-3 py-1">
                      <Text className="text-xs font-medium text-white">Looking for: {CONNECTION_TYPE_LABELS[type]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>

            <View className="mt-6 flex-row items-center justify-center gap-6">
              <Pressable
                accessibilityLabel="Pass"
                className="h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-ink-800"
                onPress={() => onSwipe("pass")}
              >
                <Ionicons name="close" size={24} color="#8A7C76" />
              </Pressable>
              <Pressable
                accessibilityLabel="Save"
                className="h-14 w-14 items-center justify-center rounded-full bg-teal-50"
                onPress={() => onSwipe("save")}
              >
                <Ionicons name="star" size={22} color="#2C8B80" />
              </Pressable>
              <Pressable
                accessibilityLabel="Like"
                className="h-16 w-16 items-center justify-center rounded-full bg-coral-500"
                onPress={() => onSwipe("like")}
              >
                <Ionicons name="heart" size={26} color="white" />
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>

      <MatchCelebrationModal matchedName={matchedName} onDismiss={() => setMatchedName(null)} />
    </SafeAreaView>
  );
}
