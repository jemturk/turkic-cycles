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
import { useWideLayout } from "@/hooks/useWideLayout";
import { useRemoveConnection } from "@/hooks/useChat";
import { confirmAlert, showAlert } from "@/lib/alert";

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
  const removeConnection = useRemoveConnection(session?.user.id);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const showSwipeActions = fromDiscover === "true";
  const wide = useWideLayout();

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

  // Ends the connection without blocking, after a confirm: the chat goes for both.
  async function onRemoveConnection() {
    setMoreOpen(false);
    if (!matchId) return;
    const name = profile?.display_name || t("common.member");
    const confirmed = await confirmAlert(
      t("discover.removeConnectionTitle", { name }),
      t("discover.removeConnectionBody"),
      { confirmLabel: t("discover.removeConnectionConfirm"), cancelLabel: t("common.cancel"), destructive: true }
    );
    if (!confirmed) return;
    removeConnection.mutate(matchId, {
      onSuccess: () => router.replace("/(app)/chat"),
      onError: () => showAlert(t("discover.removeConnectionFailed")),
    });
  }

  // Phone: the profile's quiet text actions, at the bottom. Remove connection only
  // once you're connected.
  const reportAndBlock = (
    <View className="flex-row flex-wrap gap-x-4 gap-y-2">
      <Pressable accessibilityRole="button" onPress={() => router.push(`/(app)/settings/safety/report?userId=${userId}`)}>
        <Text className="text-sm font-medium text-ink-400 dark:text-ink-300">{t("discover.report")}</Text>
      </Pressable>
      {matchId ? (
        <Pressable accessibilityRole="button" onPress={onRemoveConnection}>
          <Text className="text-sm font-medium text-ink-400 dark:text-ink-300">{t("discover.removeConnection")}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          blockUser.mutate(userId, { onSuccess: () => router.back() });
        }}
      >
        <Text className="text-sm font-medium text-ink-400 dark:text-ink-300">{t("discover.block")}</Text>
      </Pressable>
    </View>
  );

  // Desktop web: under the profile card, one row of actions in the cards' shape --
  // Pass / Like (the phone's colors) when opened from Discover, Message once you're
  // connected -- with Report, Remove connection and Block in a ⋯ menu at the end of the row.

  const moreButton = (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.more")}
        aria-expanded={moreOpen}
        onPress={() => setMoreOpen((open) => !open)}
        className="h-12 w-12 items-center justify-center rounded-2xl bg-white web:hover:bg-primary-100/40 dark:bg-ink-800 dark:web:hover:bg-ink-700"
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#4A3F3A" />
      </Pressable>
      {moreOpen ? (
        <View
          className="absolute right-0 top-14 z-10 w-52 overflow-hidden rounded-2xl bg-white py-1 dark:bg-ink-800"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 }}
        >
          <Pressable
            accessibilityRole="menuitem"
            onPress={() => {
              setMoreOpen(false);
              router.push(`/(app)/settings/safety/report?userId=${userId}`);
            }}
            className="flex-row items-center gap-3 px-4 py-3 web:hover:bg-primary-100/40 dark:web:hover:bg-ink-700"
          >
            <Ionicons name="flag-outline" size={18} color="#4A3F3A" />
            <Text className="text-sm text-ink-900 dark:text-ink-50">{t("discover.report")}</Text>
          </Pressable>
          {matchId ? (
            <Pressable
              accessibilityRole="menuitem"
              onPress={onRemoveConnection}
              className="flex-row items-center gap-3 px-4 py-3 web:hover:bg-primary-100/40 dark:web:hover:bg-ink-700"
            >
              <Ionicons name="unlink-outline" size={18} color="#4A3F3A" />
              <Text className="text-sm text-ink-900 dark:text-ink-50">{t("discover.removeConnection")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="menuitem"
            onPress={() => {
              setMoreOpen(false);
              blockUser.mutate(userId, { onSuccess: () => router.back() });
            }}
            className="flex-row items-center gap-3 px-4 py-3 web:hover:bg-accent-50 dark:web:hover:bg-ink-700"
          >
            <Ionicons name="ban-outline" size={18} color="#C1440E" />
            <Text className="text-sm text-accent-600">{t("discover.block")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const swipeRow = showSwipeActions ? (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => onSwipe("pass")}
        className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-accent-50 web:hover:bg-accent-100"
      >
        <Ionicons name="close" size={20} color="#C1440E" />
        <Text className="font-semibold text-accent-600">{t("discover.pass")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => onSwipe("like")}
        className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-accent-500 web:hover:bg-accent-600"
      >
        <Ionicons name="heart" size={18} color="#FFFFFF" />
        <Text className="font-semibold text-white">{t("discover.like")}</Text>
      </Pressable>
    </>
  ) : null;

  const messageRow = matchId ? (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/(app)/chat/${matchId}`)}
      className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-500 web:hover:bg-primary-600"
    >
      <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
      <Text className="font-semibold text-white">{t("profile.message")}</Text>
    </Pressable>
  ) : null;

  // ⋯ ends the last row; with neither row it stands on its own, at the right.
  const wideActions = (
    <View className="z-10 gap-3">
      {swipeRow ? (
        <View className="flex-row gap-3">
          {swipeRow}
          {messageRow ? null : moreButton}
        </View>
      ) : null}
      {messageRow ? (
        <View className="flex-row gap-3">
          {messageRow}
          {moreButton}
        </View>
      ) : null}
      {swipeRow || messageRow ? null : <View className="flex-row justify-end">{moreButton}</View>}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <ScrollView
        className={wide ? "flex-1 px-20 pt-9" : "flex-1 px-6 pt-6"}
        contentContainerClassName="gap-4 pb-10"
        showsVerticalScrollIndicator={!wide}
      >
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
              sideActions={wide ? wideActions : undefined}
            />
          </>
        )}
        {!wide && !loading && profile ? (
          <>
            {matchId ? (
              <Button label={t("profile.message")} onPress={() => router.push(`/(app)/chat/${matchId}`)} />
            ) : null}

            {reportAndBlock}

            {showSwipeActions ? (
              <View className="mt-4 flex-row items-center justify-center gap-6">
                <SwipeButton action="pass" onPress={() => onSwipe("pass")} />
                <SwipeButton action="like" onPress={() => onSwipe("like")} />
              </View>
            ) : null}
          </>
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
