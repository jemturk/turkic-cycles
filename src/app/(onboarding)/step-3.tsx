import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useSession } from "@/hooks/useSession";
import { useSubmitOnboardingStep3 } from "@/hooks/useOnboarding";
import { buildCorePayload, useOnboardingStore } from "@/stores/onboarding";
import { onboardingStep3Schema, type OnboardingStep3 } from "@/schemas/questionnaire/core";
import { ORIGIN_COUNTRIES, ORIGIN_MAX_SELECTIONS, ORIGIN_OTHER } from "@/constants/origins";
import { TRAVEL_FREQUENCIES, TRAVEL_STYLES } from "@/constants/interests";
import { Button } from "@/components/Button";
import { ChipGroup } from "@/components/ChipGroup";
import { SingleSelectChips } from "@/components/SingleSelectChips";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { OnboardingProgress } from "@/components/OnboardingProgress";

export default function OnboardingStep3Screen() {
  const { session } = useSession();
  const store = useOnboardingStore();
  const submitStep3 = useSubmitOnboardingStep3(session?.user.id);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingStep3>({
    resolver: zodResolver(onboardingStep3Schema),
    defaultValues: store.step3 ?? {
      usResidency: false,
      usCitizenship: false,
      europeanCitizenship: false,
      originCountries: [],
      consentOriginCountries: undefined,
      travelFrequency: undefined,
      travelStyle: [],
    },
  });

  const onSubmit = (values: OnboardingStep3) => {
    store.setStep3(values);
    const corePayload = buildCorePayload({ step2: store.step2, step3: values });
    submitStep3.mutate(
      { values, corePayload },
      { onSuccess: () => router.push("/(onboarding)/step-4") }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <OnboardingProgress step={3} totalSteps={4} />
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />

        <Text className="mt-2 font-display text-3xl text-ink-900 dark:text-ink-50">Residency & travel</Text>

        <Controller
          control={control}
          name="usResidency"
          render={({ field }) => (
            <SegmentedToggle label="US resident?" value={!!field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="usCitizenship"
          render={({ field }) => (
            <SegmentedToggle label="US citizen?" value={!!field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="europeanCitizenship"
          render={({ field }) => (
            <SegmentedToggle label="European citizen?" value={!!field.value} onChange={field.onChange} />
          )}
        />

        <Controller
          control={control}
          name="originCountries"
          render={({ field }) => (
            <ChipGroup
              label="Origin countries (up to 3)"
              options={ORIGIN_COUNTRIES}
              value={field.value ?? []}
              onChange={field.onChange}
              max={ORIGIN_MAX_SELECTIONS}
              otherOption={{ value: ORIGIN_OTHER, placeholder: "Type a country" }}
              error={errors.originCountries?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="consentOriginCountries"
          render={({ field }) => (
            <Pressable
              className="flex-row items-start gap-2"
              onPress={() => field.onChange(field.value === true ? undefined : true)}
            >
              <Ionicons
                name={field.value === true ? "checkbox" : "square-outline"}
                size={22}
                color="#D9663D"
              />
              <Text className="flex-1 text-sm text-ink-700 dark:text-ink-200">
                I consent to sharing my origin country info for matching purposes.
              </Text>
            </Pressable>
          )}
        />
        {errors.consentOriginCountries?.message ? (
          <Text className="-mt-2 text-xs text-coral-600">{errors.consentOriginCountries.message}</Text>
        ) : null}

        <Controller
          control={control}
          name="travelFrequency"
          render={({ field }) => (
            <SingleSelectChips
              label="How often do you travel?"
              options={TRAVEL_FREQUENCIES}
              value={field.value}
              onChange={field.onChange}
              error={errors.travelFrequency?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="travelStyle"
          render={({ field }) => (
            <ChipGroup label="Travel style" options={TRAVEL_STYLES} value={field.value ?? []} onChange={field.onChange} />
          )}
        />

        <View className="mt-4">
          <Button
            label={submitStep3.isPending ? "Saving..." : "Next"}
            disabled={submitStep3.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
