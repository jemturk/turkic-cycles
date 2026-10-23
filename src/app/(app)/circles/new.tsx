import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, useController, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { useSession } from "@/hooks/useSession";
import { useCreateCircle } from "@/hooks/useCircles";
import { useCanHost } from "@/hooks/useCanHost";
import { circleFormSchema, type CircleFormValues } from "@/schemas/circles";
import { CIRCLE_TOPICS } from "@/constants/circles";
import { geocodePlace } from "@/lib/geocode";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { SingleSelectChips } from "@/components/SingleSelectChips";
import { LocationFields } from "@/components/LocationFields";
import { FormScrollView } from "@/components/FormScrollView";
import { HostRequirements } from "@/components/HostRequirements";
import { showAlert } from "@/lib/alert";

// Plus with a verified ID, admins included (migration 0035 enforces it). The button
// that leads here only shows for them; anyone reaching it by URL sees what they're
// missing instead of the form. The creator becomes the owner.
export default function NewCircle() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { canHost, hasPlus, verified, isLoading } = useCanHost(userId);
  const createCircle = useCreateCircle(userId);
  const [isLocating, setIsLocating] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CircleFormValues>({
    resolver: zodResolver(circleFormSchema),
    defaultValues: { name: "", description: "", topic: undefined, city: "", state: "", country: "" },
  });
  const country = useController({ control, name: "country" });
  const city = useController({ control, name: "city" });
  const state = useController({ control, name: "state" });

  async function onSubmit(values: CircleFormValues) {
    // Coordinates let the circle appear under "Local"; without them (e.g. created
    // on web) it's still listed everywhere else.
    setIsLocating(true);
    const coords = await geocodePlace([values.city, values.state, values.country].filter(Boolean).join(", "));
    setIsLocating(false);
    createCircle.mutate(
      { ...values, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null },
      {
        onSuccess: (circleId) => router.replace(`/(app)/circles/${circleId}`),
        onError: (error) => showAlert(t("circles.createCircleError"), error.message),
      }
    );
  }

  const isSaving = isLocating || createCircle.isPending;

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <FormScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Ionicons
          name="chevron-back"
          size={24}
          className="text-ink-900 dark:text-ink-50"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
        />
        <Text className="mt-2 font-display text-3xl text-ink-900 dark:text-ink-50">{t("circles.newCircleTitle")}</Text>

        {isLoading ? (
          <ActivityIndicator color="#127A87" />
        ) : !canHost ? (
          <HostRequirements hasPlus={hasPlus} verified={verified} />
        ) : (
          <>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <TextField label={t("circles.circleName")} value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextField
                  label={t("circles.circleDescription")}
                  multiline
                  numberOfLines={4}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.description?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="topic"
              render={({ field }) => (
                <SingleSelectChips
                  label={t("circles.circleTopic")}
                  options={CIRCLE_TOPICS.map((value) => ({ value, label: t(`constants.circleTopics.${value}`) }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.topic?.message}
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

            <View className="mt-2">
              <Button
                label={isSaving ? t("circles.creating") : t("circles.createCircle")}
                disabled={isSaving}
                onPress={handleSubmit(onSubmit)}
              />
            </View>
          </>
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}
