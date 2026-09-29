import { ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <OnboardingProgress step={2} totalSteps={4} />
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />

        <Text className="mt-2 font-display text-3xl text-ink-900 dark:text-ink-50">
          {t("onboarding.step2.heading")}
        </Text>
        <Text className="text-base text-ink-700 dark:text-ink-200">{t("onboarding.step2.subheading")}</Text>

        <Controller
          control={control}
          name="languages"
          render={({ field }) => (
            <ChipGroup
              label={t("onboarding.step2.languagesYouSpeak")}
              options={LANGUAGES}
              value={field.value ?? []}
              onChange={field.onChange}
              otherOption={{ value: LANGUAGE_OTHER, placeholder: t("onboarding.step2.typeLanguage") }}
              error={errors.languages?.message}
              namespace="languages"
            />
          )}
        />

        <Controller
          control={control}
          name="interests"
          render={({ field }) => (
            <ChipGroup
              label={t("onboarding.step2.interests")}
              options={INTERESTS}
              value={field.value ?? []}
              onChange={field.onChange}
              namespace="interests"
            />
          )}
        />

        <Controller
          control={control}
          name="hobbies"
          render={({ field }) => (
            <ChipGroup
              label={t("onboarding.step2.hobbies")}
              options={HOBBIES}
              value={field.value ?? []}
              onChange={field.onChange}
              namespace="hobbies"
            />
          )}
        />

        <Controller
          control={control}
          name="occupation"
          render={({ field }) => (
            <TextField
              label={t("onboarding.step2.occupation")}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.occupation?.message}
            />
          )}
        />

        <View className="mt-4">
          <Button
            label={submitStep2.isPending ? t("onboarding.saving") : t("onboarding.next")}
            disabled={submitStep2.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
