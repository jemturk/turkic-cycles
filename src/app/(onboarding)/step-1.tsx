import { Alert, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, useController, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { useSession } from "@/hooks/useSession";
import { useSubmitOnboardingStep1 } from "@/hooks/useOnboarding";
import { useOnboardingStore } from "@/stores/onboarding";
import { onboardingStep1FormSchema, type OnboardingStep1 } from "@/schemas/questionnaire/core";
import { canonicalCountry } from "@/constants/countries";
import { CONNECTION_TYPES } from "@/constants/connectionTypes";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import { DateOfBirthField } from "@/components/DateOfBirthField";
import { LocationFields } from "@/components/LocationFields";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { FormScrollView } from "@/components/FormScrollView";

export default function OnboardingStep1Screen() {
  const { t } = useTranslation();
  const CONNECTION_TYPE_OPTIONS = CONNECTION_TYPES.map((value) => ({
    value,
    label: t(`constants.connectionTypes.${value}`),
  }));
  const { session } = useSession();
  const store = useOnboardingStore();
  const submitStep1 = useSubmitOnboardingStep1(session?.user.id);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingStep1>({
    resolver: zodResolver(onboardingStep1FormSchema),
    defaultValues: store.step1 ? { ...store.step1, country: canonicalCountry(store.step1.country) } : {
      displayName: "",
      connectionTypes: [],
      city: "",
      state: "",
      country: "",
      birthdate: "",
    },
  });

  const country = useController({ control, name: "country" });
  const city = useController({ control, name: "city" });
  const state = useController({ control, name: "state" });

  const onSubmit = (values: OnboardingStep1) => {
    store.setStep1(values);
    submitStep1.mutate(values, {
      onSuccess: () => router.push("/(onboarding)/step-2"),
      onError: (error) => Alert.alert(t("onboarding.saveErrorTitle"), error.message),
    });
  };

  // step-1 is always reached via a redirect (post sign-up/login), never a push, so
  // there's no screen to pop back to -- and there's nowhere else for an
  // authenticated-but-incomplete-profile user to land (the root gate would just send
  // them right back here). Signing out and going to login is the only real "back":
  // whatever they already completed is saved server-side, so logging in again resumes
  // at the right step via profiles.onboarding_step.
  const onBack = async () => {
    store.reset();
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <FormScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <OnboardingProgress step={1} totalSteps={5} />
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={onBack} />

        <Text className="mt-2 font-display text-3xl text-ink-900 dark:text-ink-50">
          {t("onboarding.step1.heading")}
        </Text>
        <Text className="text-base text-ink-700 dark:text-ink-200">{t("onboarding.step1.subheading")}</Text>

        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <TextField
              label={t("onboarding.step1.yourName")}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.displayName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="connectionTypes"
          render={({ field }) => (
            <ChipGroup
              label={t("onboarding.step1.lookingFor")}
              options={CONNECTION_TYPE_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
              error={errors.connectionTypes?.message}
            />
          )}
        />

        <LocationFields
          country={country.field.value}
          city={city.field.value}
          state={state.field.value}
          onCountryChange={country.field.onChange}
          onCityChange={city.field.onChange}
          onStateChange={state.field.onChange}
          errors={{ country: errors.country?.message, city: errors.city?.message, state: errors.state?.message }}
        />

        <Controller
          control={control}
          name="birthdate"
          render={({ field }) => (
            <DateOfBirthField value={field.value} onChange={field.onChange} error={errors.birthdate?.message} />
          )}
        />

        <View className="mt-4">
          <Button
            label={submitStep1.isPending ? t("onboarding.saving") : t("onboarding.next")}
            disabled={submitStep1.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </FormScrollView>
    </SafeAreaView>
  );
}
