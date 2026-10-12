import { ActivityIndicator, Alert, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { useSession } from "@/hooks/useSession";
import { useCircle, useCreateCircleEvent, useIsAppAdmin, useMyCircleRole } from "@/hooks/useCircles";
import { combineDateTime, eventFormSchema, type EventFormValues } from "@/schemas/circles";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { DateOfBirthField } from "@/components/DateOfBirthField";
import { TimeField } from "@/components/TimeField";
import { FormScrollView } from "@/components/FormScrollView";

// A circle's owners and moderators, and app admins, can add events (migration
// 0031 enforces it; the "Add event" button only shows for them).
export default function NewCircleEvent() {
  const { t } = useTranslation();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: circle } = useCircle(circleId);
  const { data: role, isLoading: roleLoading } = useMyCircleRole(circleId, userId);
  const { data: isAdmin, isLoading: adminLoading } = useIsAppAdmin(userId);
  const createEvent = useCreateCircleEvent(circleId);
  const canCreate = isAdmin || role === "owner" || role === "moderator";

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { title: "", description: "", location: "", date: "", time: "" },
  });

  function onSubmit(values: EventFormValues) {
    const startsAt = combineDateTime(values.date, values.time);
    if (!startsAt) return; // the schema already rejected this
    createEvent.mutate(
      { circleId, title: values.title, description: values.description, location: values.location, startsAt: startsAt.toISOString() },
      {
        onSuccess: () => router.back(),
        onError: (error) => Alert.alert(t("circles.createEventError"), error.message),
      }
    );
  }

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
        <View className="mt-2 gap-1">
          <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">{t("circles.newEventTitle")}</Text>
          {circle ? <Text className="text-base text-ink-700 dark:text-ink-200">{circle.name}</Text> : null}
        </View>

        {roleLoading || adminLoading ? (
          <ActivityIndicator color="#127A87" />
        ) : !canCreate ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("circles.organizersOnly")}</Text>
        ) : (
          <>
            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <TextField label={t("circles.eventTitle")} value={field.value} onChangeText={field.onChange} error={errors.title?.message} />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <TextField
                  label={t("circles.eventDescription")}
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
              name="location"
              render={({ field }) => (
                <TextField
                  label={t("circles.eventLocation")}
                  placeholder={t("circles.eventLocationPlaceholder")}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.location?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DateOfBirthField label={t("circles.eventDate")} value={field.value} onChange={field.onChange} error={errors.date?.message} />
              )}
            />
            <Controller
              control={control}
              name="time"
              render={({ field }) => (
                <TimeField label={t("circles.eventTime")} value={field.value} onChange={field.onChange} error={errors.time?.message} />
              )}
            />

            <View className="mt-2">
              <Button
                label={createEvent.isPending ? t("circles.creating") : t("circles.createEvent")}
                disabled={createEvent.isPending}
                onPress={handleSubmit(onSubmit)}
              />
            </View>
          </>
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}
