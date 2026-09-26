import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";

export default function Index() {
  const { session, isLoading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useMyProfile(session?.user.id);

  if (sessionLoading || (session && profileLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-coral-50">
        <ActivityIndicator color="#D9663D" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!profile?.onboarding_completed_at) {
    return <Redirect href="/(onboarding)/step-1" />;
  }

  return <Redirect href="/(app)/circles" />;
}
