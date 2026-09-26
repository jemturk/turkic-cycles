import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useSession } from "@/hooks/useSession";
import { useCompleteOnboarding } from "@/hooks/useProfile";
import { Button } from "@/components/Button";

// Placeholder for the full 3-step onboarding flow (Phase 1: connection-type
// picker, languages/interests/hobbies, residency/origin/travel). Wired here
// just enough to complete the auth -> onboarding -> app redirect loop end to end.
export default function OnboardingStep1() {
  const { session } = useSession();
  const completeOnboarding = useCompleteOnboarding(session?.user.id);

  return (
    <SafeAreaView className="flex-1 bg-coral-50 px-6 pt-10">
      <View className="h-1.5 w-full flex-row gap-1">
        <View className="h-full flex-1 rounded-full bg-coral-500" />
        <View className="h-full flex-1 rounded-full bg-coral-100" />
        <View className="h-full flex-1 rounded-full bg-coral-100" />
      </View>

      <Text className="mt-8 font-display text-3xl text-ink-900">Tell us about you</Text>
      <Text className="mt-2 text-base text-ink-700">
        The full onboarding flow (connection goals, languages, interests, origin, travel style)
        lands in Phase 1. For now, complete this stub to reach the app shell.
      </Text>

      <View className="mt-10">
        <Button
          label={completeOnboarding.isPending ? "Saving..." : "Finish setting up profile"}
          disabled={completeOnboarding.isPending}
          onPress={() => completeOnboarding.mutate(undefined, { onSuccess: () => router.replace("/") })}
        />
      </View>
    </SafeAreaView>
  );
}
