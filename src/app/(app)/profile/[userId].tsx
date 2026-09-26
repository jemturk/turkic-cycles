import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyConnectionTypes } from "@/hooks/useOnboarding";
import { useOriginCountriesWithConsent, useRecordSwipe } from "@/hooks/useDiscover";
import { ProfileView } from "@/components/ProfileView";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";

export default function OtherProfile() {
  const { userId, circleId, fromDiscover } = useLocalSearchParams<{
    userId: string;
    circleId?: string;
    fromDiscover?: string;
  }>();
  const { session } = useSession();

  const { data: profile } = useMyProfile(userId);
  const { data: connectionTypes } = useMyConnectionTypes(userId);
  const { data: originCountries } = useOriginCountriesWithConsent(userId);
  const recordSwipe = useRecordSwipe(circleId, session?.user.id);
  const [matchedName, setMatchedName] = useState<string | null>(null);

  const showSwipeActions = fromDiscover === "true" && !!circleId;

  function onSwipe(action: "like" | "pass") {
    recordSwipe.mutate(
      { targetId: userId, action },
      {
        onSuccess: (isMatch) => {
          if (isMatch) {
            setMatchedName(profile?.display_name ?? "them");
          } else {
            router.back();
          }
        },
      }
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#2B2320" />
        </Pressable>

        <ProfileView profile={profile} connectionTypes={connectionTypes} originCountries={originCountries} />

        {showSwipeActions ? (
          <View className="mt-4 flex-row items-center justify-center gap-6">
            <Pressable
              accessibilityLabel="Pass"
              className="h-14 w-14 items-center justify-center rounded-full bg-white"
              onPress={() => onSwipe("pass")}
            >
              <Ionicons name="close" size={24} color="#8A7C76" />
            </Pressable>
            <Pressable
              accessibilityLabel="Like"
              className="h-16 w-16 items-center justify-center rounded-full bg-coral-500"
              onPress={() => onSwipe("like")}
            >
              <Ionicons name="heart" size={26} color="white" />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <MatchCelebrationModal
        matchedName={matchedName}
        onDismiss={() => {
          setMatchedName(null);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
