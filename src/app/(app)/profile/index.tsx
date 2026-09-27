import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyConnectionTypes, useMyProfileSensitive } from "@/hooks/useOnboarding";
import { useMyVerificationStatus } from "@/hooks/useVerification";
import { Button } from "@/components/Button";
import { ProfileView } from "@/components/ProfileView";

export default function OwnProfile() {
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const { data: connectionTypes } = useMyConnectionTypes(session?.user.id);
  const { data: sensitive } = useMyProfileSensitive(session?.user.id);
  const { data: verification } = useMyVerificationStatus(session?.user.id);

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <ProfileView
          profile={profile}
          connectionTypes={connectionTypes}
          originCountries={sensitive?.origin_countries}
          fallbackName={session?.user.email}
          verificationStatus={verification?.status}
          ownUserId={session?.user.id}
        />

        <View className="mt-4">
          <Button label="Edit profile" onPress={() => router.push("/(app)/profile/edit")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
