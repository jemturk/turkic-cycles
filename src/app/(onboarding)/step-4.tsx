import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useSession } from "@/hooks/useSession";
import { useMyConnectionTypes, useSubmitOnboardingStep4AndComplete } from "@/hooks/useOnboarding";
import { useOnboardingStore } from "@/stores/onboarding";
import { buildStep4Schema, type Step4Answers } from "@/schemas/questionnaire/step4";
import { Button } from "@/components/Button";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { BranchingQuestionsFields } from "@/components/BranchingQuestionsFields";

export default function OnboardingStep4() {
  const { session } = useSession();
  const store = useOnboardingStore();
  const { data: savedConnectionTypes } = useMyConnectionTypes(session?.user.id);
  const submitStep4 = useSubmitOnboardingStep4AndComplete(session?.user.id);

  const connectionTypes = useMemo(
    () => store.step1?.connectionTypes ?? savedConnectionTypes ?? [],
    [store.step1?.connectionTypes, savedConnectionTypes]
  );
  const schema = useMemo(() => buildStep4Schema(connectionTypes), [connectionTypes]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Step4Answers>({
    resolver: zodResolver(schema),
    defaultValues: store.step4Answers,
  });

  const onSubmit = (values: Step4Answers) => {
    store.setStep4Answers(values);
    submitStep4.mutate(values, {
      onSuccess: () => {
        store.reset();
        // Navigate straight to the app shell rather than through "/" (the
        // redirect gate): the gate's useMyProfile query has a stale cached
        // profile.onboarding_completed_at=null from before this write, and
        // TanStack Query renders that cached value synchronously (isLoading
        // false) before its background refetch resolves — the gate would
        // bounce straight back to onboarding on that first stale render.
        router.replace("/(app)/circles");
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-6 pb-10">
        <OnboardingProgress step={4} totalSteps={4} />
        <Ionicons name="chevron-back" size={24} color="#2B2320" onPress={() => router.back()} />

        <Text className="mt-2 font-display text-3xl text-ink-900">A few more questions</Text>

        <BranchingQuestionsFields control={control} errors={errors} connectionTypes={connectionTypes} />

        <View className="mt-2">
          <Button
            label={submitStep4.isPending ? "Saving..." : "Finish"}
            disabled={submitStep4.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
