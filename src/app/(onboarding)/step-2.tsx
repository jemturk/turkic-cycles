import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useSession } from "@/hooks/useSession";
import { useSubmitOnboardingStep2 } from "@/hooks/useOnboarding";
import { buildCorePayload, useOnboardingStore } from "@/stores/onboarding";
import { onboardingStep2Schema, type OnboardingStep2 } from "@/schemas/questionnaire/core";
import { LANGUAGES, LANGUAGE_OTHER } from "@/constants/languages";
import { INTERESTS, HOBBIES } from "@/constants/interests";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import { OnboardingProgress } from "@/components/OnboardingProgress";

export default function OnboardingStep2Screen() {
  const { session } = useSession();
  const store = useOnboardingStore();
  const submitStep2 = useSubmitOnboardingStep2(session?.user.id);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingStep2>({
    resolver: zodResolver(onboardingStep2Schema),
    defaultValues: store.step2 ?? { languages: [], interests: [], hobbies: [], occupation: "" },
  });

  const onSubmit = (values: OnboardingStep2) => {
    store.setStep2(values);
    const corePayload = buildCorePayload({ step2: values, step3: store.step3 });
    submitStep2.mutate(
      { values, corePayload },
      { onSuccess: () => router.push("/(onboarding)/step-3") }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <OnboardingProgress step={2} totalSteps={4} />
        <Ionicons name="chevron-back" size={24} color="#2B2320" onPress={() => router.back()} />

        <Text className="mt-2 font-display text-3xl text-ink-900">What do you enjoy?</Text>
        <Text className="text-base text-ink-700">Languages, interests, and what you do.</Text>

        <Controller
          control={control}
          name="languages"
          render={({ field }) => (
            <ChipGroup
              label="Languages you speak"
              options={LANGUAGES}
              value={field.value ?? []}
              onChange={field.onChange}
              otherOption={{ value: LANGUAGE_OTHER, placeholder: "Type a language" }}
              error={errors.languages?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="interests"
          render={({ field }) => (
            <ChipGroup label="Interests" options={INTERESTS} value={field.value ?? []} onChange={field.onChange} />
          )}
        />

        <Controller
          control={control}
          name="hobbies"
          render={({ field }) => (
            <ChipGroup label="Hobbies" options={HOBBIES} value={field.value ?? []} onChange={field.onChange} />
          )}
        />

        <Controller
          control={control}
          name="occupation"
          render={({ field }) => (
            <TextField
              label="Occupation"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.occupation?.message}
            />
          )}
        />

        <View className="mt-4">
          <Button
            label={submitStep2.isPending ? "Saving..." : "Next"}
            disabled={submitStep2.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
