import { ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useProfilePhotos } from "@/hooks/useGallery";
import { COVER_POSITION } from "@/api/gallery";
import { useSubmitOnboardingPhotosAndComplete } from "@/hooks/useOnboarding";
import { useOnboardingStore } from "@/stores/onboarding";
import { Button } from "@/components/Button";
import { EditableAvatar } from "@/components/EditableAvatar";
import { EditablePhotoGallery } from "@/components/EditablePhotoGallery";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { showAlert } from "@/lib/alert";

function Requirement({ done, label }: { done: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons
        name={done ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={done ? "#2C8B80" : "#A99C95"}
      />
      <Text className={`text-sm ${done ? "text-ink-900 dark:text-ink-50" : "text-ink-400"}`}>{label}</Text>
    </View>
  );
}

// Last onboarding step: a profile picture and a cover photo, both required (the
// database enforces the same rule -- migrations 0026/0027). Photos upload
// as soon as they're picked, so leaving and coming back keeps them.
export default function OnboardingStep5() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const store = useOnboardingStore();
  const { data: profile } = useMyProfile(userId);
  const { data: photos } = useProfilePhotos(userId);
  const complete = useSubmitOnboardingPhotosAndComplete(userId);

  const hasAvatar = !!profile?.avatar_url;
  // The cover specifically -- it's the Discover card's background.
  const hasPhoto = photos?.some((p) => p.position === COVER_POSITION) ?? false;

  function onFinish() {
    complete.mutate(undefined, {
      onSuccess: () => {
        store.reset();
        // Straight to the app shell rather than through "/" (the redirect gate):
        // the gate's cached profile still has onboarding_completed_at=null until
        // its refetch lands, and would bounce back here on that stale render.
        router.replace("/(app)/circles");
      },
      onError: (error) => showAlert(t("onboarding.step5.errorTitle"), error.message),
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-6 pb-10">
        <OnboardingProgress step={5} totalSteps={5} />
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />

        <View className="gap-2">
          <Text className="mt-2 font-display text-3xl text-ink-900 dark:text-ink-50">
            {t("onboarding.step5.heading")}
          </Text>
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("onboarding.step5.subheading")}</Text>
        </View>

        {userId ? (
          <>
            <View className="items-center gap-2">
              <EditableAvatar userId={userId} uri={profile?.avatar_url} name={profile?.display_name} size={120} />
              <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">
                {t("onboarding.step5.profilePicture")}
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">
                {t("onboarding.step5.morePhotos")}
              </Text>
              <EditablePhotoGallery userId={userId} photos={photos} />
            </View>
          </>
        ) : null}

        <View className="gap-2 rounded-xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
          <Requirement done={hasAvatar} label={t("onboarding.step5.needProfilePicture")} />
          <Requirement done={hasPhoto} label={t("onboarding.step5.needPhoto")} />
        </View>

        <Button
          label={complete.isPending ? t("onboarding.saving") : t("onboarding.step4.finish")}
          disabled={!hasAvatar || !hasPhoto || complete.isPending}
          onPress={onFinish}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
