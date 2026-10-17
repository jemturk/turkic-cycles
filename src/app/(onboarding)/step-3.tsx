import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

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
import { FormScrollView } from "@/components/FormScrollView";
import { showAlert } from "@/lib/alert";

export default function OnboardingStep3Screen() {
  const { t } = useTranslation();
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
      {
        onSuccess: () => router.push("/(onboarding)/step-4"),
        onError: (error) => showAlert(t("onboarding.saveErrorTitle"), error.message),
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <FormScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <OnboardingProgress step={3} totalSteps={5} />
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />

        <Text className="mt-2 font-display text-3xl text-ink-900 dark:text-ink-50">
          {t("onboarding.step3.heading")}
        </Text>

        <Controller
          control={control}
          name="usResidency"
          render={({ field }) => (
            <SegmentedToggle label={t("onboarding.step3.usResident")} value={!!field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="usCitizenship"
          render={({ field }) => (
            <SegmentedToggle label={t("onboarding.step3.usCitizen")} value={!!field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="europeanCitizenship"
          render={({ field }) => (
            <SegmentedToggle
              label={t("onboarding.step3.europeanCitizen")}
              value={!!field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="originCountries"
          render={({ field }) => (
            <ChipGroup
              label={t("onboarding.step3.originCountries")}
              options={ORIGIN_COUNTRIES}
              value={field.value ?? []}
              onChange={field.onChange}
              max={ORIGIN_MAX_SELECTIONS}
              otherOption={{ value: ORIGIN_OTHER, placeholder: t("onboarding.step3.typeCountry") }}
              error={errors.originCountries?.message}
              namespace="originCountries"
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
                color="#127A87"
              />
              <Text className="flex-1 text-sm text-ink-700 dark:text-ink-200">
                {t("onboarding.step3.consentOriginCountries")}
              </Text>
            </Pressable>
          )}
        />
        {errors.consentOriginCountries?.message ? (
          <Text className="-mt-2 text-xs text-accent-600">{errors.consentOriginCountries.message}</Text>
        ) : null}

        <Controller
          control={control}
          name="travelFrequency"
          render={({ field }) => (
            <SingleSelectChips
              label={t("onboarding.step3.travelFrequency")}
              options={TRAVEL_FREQUENCIES.map((f) => ({
                value: f.value,
                label: t(`constants.travelFrequencies.${f.value}`),
              }))}
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
            <ChipGroup
              label={t("onboarding.step3.travelStyle")}
              options={TRAVEL_STYLES}
              value={field.value ?? []}
              onChange={field.onChange}
              namespace="travelStyles"
            />
          )}
        />

        <View className="mt-4">
          <Button
            label={submitStep3.isPending ? t("onboarding.saving") : t("onboarding.next")}
            disabled={submitStep3.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </FormScrollView>
    </SafeAreaView>
  );
}
