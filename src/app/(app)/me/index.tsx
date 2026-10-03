import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyConnectionTypes, useMyProfileSensitive } from "@/hooks/useOnboarding";
import { useMyVerificationStatus } from "@/hooks/useVerification";
import { Button } from "@/components/Button";
import { ProfileView } from "@/components/ProfileView";

export default function OwnProfile() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const { data: connectionTypes } = useMyConnectionTypes(session?.user.id);
  const { data: sensitive } = useMyProfileSensitive(session?.user.id);
  const { data: verification } = useMyVerificationStatus(session?.user.id);

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable accessibilityLabel={t("common.back")} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <ProfileView
          profile={profile}
          connectionTypes={connectionTypes}
          originCountries={sensitive?.origin_countries}
          fallbackName={session?.user.email}
          verificationStatus={verification?.status}
          ownUserId={session?.user.id}
        />

        <View className="mt-4">
          <Button label={t("profile.editProfile")} onPress={() => router.push("/(app)/me/edit")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
