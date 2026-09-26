import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useSession } from "@/hooks/useSession";
import { useSubmitOnboardingStep1 } from "@/hooks/useOnboarding";
import { useOnboardingStore } from "@/stores/onboarding";
import { onboardingStep1Schema, type OnboardingStep1 } from "@/schemas/questionnaire/core";
import { CONNECTION_TYPES, CONNECTION_TYPE_LABELS } from "@/constants/connectionTypes";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import { DateOfBirthField } from "@/components/DateOfBirthField";
import { OnboardingProgress } from "@/components/OnboardingProgress";

const CONNECTION_TYPE_OPTIONS = CONNECTION_TYPES.map((value) => ({
  value,
  label: CONNECTION_TYPE_LABELS[value],
}));

export default function OnboardingStep1Screen() {
  const { session } = useSession();
  const store = useOnboardingStore();
  const submitStep1 = useSubmitOnboardingStep1(session?.user.id);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingStep1>({
    resolver: zodResolver(onboardingStep1Schema),
    defaultValues: store.step1 ?? {
      displayName: "",
      connectionTypes: [],
      city: "",
      state: "",
      country: "",
      birthdate: "",
    },
  });

  const onSubmit = (values: OnboardingStep1) => {
    store.setStep1(values);
    submitStep1.mutate(values, {
      onSuccess: () => router.push("/(onboarding)/step-2"),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <OnboardingProgress step={1} totalSteps={4} />
        <Ionicons name="chevron-back" size={24} color="#2B2320" onPress={() => router.back()} />

        <Text className="mt-2 font-display text-3xl text-ink-900">Tell us about you</Text>
        <Text className="text-base text-ink-700">Let&apos;s start with the basics.</Text>

        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <TextField
              label="Your name"
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
              label="What are you looking for?"
              options={CONNECTION_TYPE_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
              error={errors.connectionTypes?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="city"
          render={({ field }) => (
            <TextField label="City" value={field.value} onChangeText={field.onChange} error={errors.city?.message} />
          )}
        />
        <Controller
          control={control}
          name="state"
          render={({ field }) => (
            <TextField
              label="State / region"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.state?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <TextField
              label="Country"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.country?.message}
            />
          )}
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
            label={submitStep1.isPending ? "Saving..." : "Next"}
            disabled={submitStep1.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
