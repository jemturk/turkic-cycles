import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";

const ONBOARDING_STEP_ROUTES: Record<number, "/(onboarding)/step-1" | "/(onboarding)/step-2" | "/(onboarding)/step-3" | "/(onboarding)/step-4"> = {
  1: "/(onboarding)/step-1",
  2: "/(onboarding)/step-2",
  3: "/(onboarding)/step-3",
  4: "/(onboarding)/step-4",
};

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
    const step = profile?.onboarding_step ?? 1;
    return <Redirect href={ONBOARDING_STEP_ROUTES[step] ?? ONBOARDING_STEP_ROUTES[1]} />;
  }

  return <Redirect href="/(app)/circles" />;
}
