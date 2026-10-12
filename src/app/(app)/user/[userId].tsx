import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyConnectionTypes } from "@/hooks/useOnboarding";
import { useOriginCountriesWithConsent, useRecordSwipe } from "@/hooks/useDiscover";
import { useOtherUserVerificationStatus } from "@/hooks/useVerification";
import { useProfilePhotos } from "@/hooks/useGallery";
import { useBlockUser } from "@/hooks/useSettings";
import { ProfileView } from "@/components/ProfileView";
import { MatchCelebrationModal } from "@/components/MatchCelebrationModal";
import { Button } from "@/components/Button";
import { SwipeButton } from "@/components/SwipeButton";

export default function OtherProfile() {
  const { t } = useTranslation();
  const { userId, circleId, fromDiscover, matchId } = useLocalSearchParams<{
    userId: string;
    circleId?: string;
    fromDiscover?: string;
    matchId?: string;
  }>();
  const { session } = useSession();

  const { data: profile, isLoading: profileLoading } = useMyProfile(userId);
  const { data: connectionTypes, isLoading: connectionTypesLoading } = useMyConnectionTypes(userId);
  const { data: originCountries, isLoading: originCountriesLoading } = useOriginCountriesWithConsent(userId);
  const { data: verificationStatus, isLoading: verificationLoading } = useOtherUserVerificationStatus(userId);
  // Only to know when the gallery has loaded -- ProfileView reads the same cached query.
  const { isLoading: photosLoading } = useProfilePhotos(userId);
  // Everything the profile shows, not just the profile row: each of these adds a
  // section (gallery, tags, badge) when it lands, so drawing before all of them
  // were in made the page shift several times as it filled in.
  const loading =
    profileLoading || connectionTypesLoading || originCountriesLoading || verificationLoading || photosLoading;
  // No circleId = opened from the global Discover tab, so swipes go to that scope.
  const recordSwipe = useRecordSwipe(circleId ?? null, session?.user.id);
  const blockUser = useBlockUser(session?.user.id);
  const [matchedName, setMatchedName] = useState<string | null>(null);

  const showSwipeActions = fromDiscover === "true";

  function onSwipe(action: "like" | "pass") {
    recordSwipe.mutate(
      { targetId: userId, action },
      {
        onSuccess: (isMatch) => {
          if (isMatch) {
            setMatchedName(profile?.display_name ?? t("discover.them"));
          } else {
            router.back();
          }
        },
      }
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        {/* Nothing below the back button until all of it has loaded: drawn
            straight away, the buttons sat at the top of an empty screen and then
            jumped down as the profile filled in above them. */}
        {loading || !profile ? (
          loading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#127A87" />
            </View>
          ) : null
        ) : (
          <>
            <ProfileView
              profile={profile}
              connectionTypes={connectionTypes}
              originCountries={originCountries}
              verificationStatus={verificationStatus}
            />

            {matchId ? (
              <Button label={t("profile.message")} onPress={() => router.push(`/(app)/chat/${matchId}`)} />
            ) : null}

            <View className="flex-row gap-4">
              <Pressable onPress={() => router.push(`/(app)/settings/safety/report?userId=${userId}`)}>
                <Text className="text-sm font-medium text-ink-400">{t("discover.report")}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  blockUser.mutate(userId, { onSuccess: () => router.back() });
                }}
              >
                <Text className="text-sm font-medium text-ink-400">{t("discover.block")}</Text>
              </Pressable>
            </View>

            {showSwipeActions ? (
              <View className="mt-4 flex-row items-center justify-center gap-6">
                <SwipeButton action="pass" onPress={() => onSwipe("pass")} />
                <SwipeButton action="like" onPress={() => onSwipe("like")} />
              </View>
            ) : null}
          </>
        )}
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
