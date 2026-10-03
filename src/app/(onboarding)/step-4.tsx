import { useMemo } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMyConnectionTypes, useSubmitOnboardingStep4 } from "@/hooks/useOnboarding";
import { useOnboardingStore } from "@/stores/onboarding";
import { buildStep4Schema, type Step4Answers } from "@/schemas/questionnaire/step4";
import { Button } from "@/components/Button";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { BranchingQuestionsFields } from "@/components/BranchingQuestionsFields";
import { FormScrollView } from "@/components/FormScrollView";

export default function OnboardingStep4() {
  const { t } = useTranslation();
  const { session } = useSession();
  const store = useOnboardingStore();
  const { data: savedConnectionTypes } = useMyConnectionTypes(session?.user.id);
  const submitStep4 = useSubmitOnboardingStep4(session?.user.id);

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
      onSuccess: () => router.push("/(onboarding)/step-5"),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <FormScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-6 pb-10">
        <OnboardingProgress step={4} totalSteps={5} />
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />

        <Text className="mt-2 font-display text-3xl text-ink-900 dark:text-ink-50">
          {t("onboarding.step4.heading")}
        </Text>

        <BranchingQuestionsFields control={control} errors={errors} connectionTypes={connectionTypes} />

        <View className="mt-2">
          <Button
            label={submitStep4.isPending ? t("onboarding.saving") : t("onboarding.next")}
            disabled={submitStep4.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </FormScrollView>
    </SafeAreaView>
  );
}
