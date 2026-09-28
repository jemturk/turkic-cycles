import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, useWatch, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import {
  useMyConnectionTypes,
  useMyProfileSensitive,
  useMyQuestionnaireResponses,
  useSaveProfileEdit,
} from "@/hooks/useOnboarding";
import { buildProfileEditSchema, type ProfileEditValues } from "@/schemas/questionnaire/profileEdit";
import { CONNECTION_TYPES } from "@/constants/connectionTypes";
import { LANGUAGES, LANGUAGE_OTHER } from "@/constants/languages";
import { INTERESTS, HOBBIES, TRAVEL_FREQUENCIES, TRAVEL_STYLES } from "@/constants/interests";
import { ORIGIN_COUNTRIES, ORIGIN_MAX_SELECTIONS, ORIGIN_OTHER } from "@/constants/origins";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import { SingleSelectChips } from "@/components/SingleSelectChips";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { BranchingQuestionsFields } from "@/components/BranchingQuestionsFields";

const resolver: Resolver<ProfileEditValues> = (values, context, options) =>
  zodResolver(buildProfileEditSchema(values.connectionTypes ?? []))(values, context, options);

export default function ProfileEdit() {
  const { t } = useTranslation();
  const CONNECTION_TYPE_OPTIONS = CONNECTION_TYPES.map((value) => ({
    value,
    label: t(`constants.connectionTypes.${value}`),
  }));
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile, isLoading: profileLoading } = useMyProfile(userId);
  const { data: connectionTypes, isLoading: connectionTypesLoading } = useMyConnectionTypes(userId);
  const { data: questionnaire, isLoading: questionnaireLoading } = useMyQuestionnaireResponses(userId);
  const { data: sensitive, isLoading: sensitiveLoading } = useMyProfileSensitive(userId);
  const saveProfileEdit = useSaveProfileEdit(userId);

  const isLoading = profileLoading || connectionTypesLoading || questionnaireLoading || sensitiveLoading;

  const values = useMemo<ProfileEditValues | undefined>(() => {
    if (!profile) return undefined;
    const core = (questionnaire?.core ?? {}) as Record<string, unknown>;
    const answers = (questionnaire?.answers ?? {}) as Record<string, unknown>;
    const originCountries = sensitive?.origin_countries ?? [];
    return {
      displayName: profile.display_name ?? "",
      connectionTypes: connectionTypes ?? [],
      city: profile.city ?? "",
      state: profile.state ?? "",
      country: profile.country ?? "",
      birthdate: profile.birthdate ?? "",
      bio: profile.bio ?? "",
      languages: profile.languages ?? [],
      interests: profile.interests ?? [],
      hobbies: profile.hobbies ?? [],
      occupation: profile.occupation ?? "",
      usResidency: profile.us_residency ?? false,
      usCitizenship: profile.us_citizenship ?? false,
      europeanCitizenship: profile.european_citizenship ?? false,
      originCountries,
      consentOriginCountries: originCountries.length > 0 ? true : undefined,
      travelFrequency: (profile.travel_frequency ?? core.travelFrequency) as ProfileEditValues["travelFrequency"],
      travelStyle: profile.travel_style ?? [],
      ...answers,
    } as ProfileEditValues;
  }, [profile, connectionTypes, questionnaire, sensitive]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileEditValues>({ resolver, values });

  const watchedConnectionTypes = useWatch({ control, name: "connectionTypes" }) ?? [];

  const onSubmit = (formValues: ProfileEditValues) => {
    saveProfileEdit.mutate(formValues, { onSuccess: () => router.back() });
  };

  if (isLoading || !values) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-coral-50 dark:bg-ink-950">
        <ActivityIndicator color="#D9663D" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />
        <Text className="mt-2 font-display text-3xl text-ink-900 dark:text-ink-50">{t("fields.editProfileHeading")}</Text>

        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <TextField label={t("fields.yourName")} value={field.value} onChangeText={field.onChange} error={errors.displayName?.message} />
          )}
        />
        <Controller
          control={control}
          name="bio"
          render={({ field }) => (
            <TextField
              label={t("fields.bio")}
              multiline
              numberOfLines={4}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.bio?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="connectionTypes"
          render={({ field }) => (
            <ChipGroup
              label={t("fields.lookingFor")}
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
            <TextField label={t("fields.city")} value={field.value} onChangeText={field.onChange} error={errors.city?.message} />
          )}
        />
        <Controller
          control={control}
          name="state"
          render={({ field }) => (
            <TextField label={t("fields.stateRegion")} value={field.value} onChangeText={field.onChange} error={errors.state?.message} />
          )}
        />
        <Controller
          control={control}
          name="country"
          render={({ field }) => (
            <TextField label={t("fields.country")} value={field.value} onChangeText={field.onChange} error={errors.country?.message} />
          )}
        />
        <Controller
          control={control}
          name="occupation"
          render={({ field }) => (
            <TextField label={t("fields.occupation")} value={field.value} onChangeText={field.onChange} error={errors.occupation?.message} />
          )}
        />

        <Controller
          control={control}
          name="languages"
          render={({ field }) => (
            <ChipGroup
              label={t("fields.languagesYouSpeak")}
              options={LANGUAGES}
              value={field.value ?? []}
              onChange={field.onChange}
              otherOption={{ value: LANGUAGE_OTHER, placeholder: t("fields.typeLanguage") }}
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
              label={t("fields.interests")}
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
              label={t("fields.hobbies")}
              options={HOBBIES}
              value={field.value ?? []}
              onChange={field.onChange}
              namespace="hobbies"
            />
          )}
        />

        <Controller
          control={control}
          name="usResidency"
          render={({ field }) => <SegmentedToggle label={t("fields.usResident")} value={!!field.value} onChange={field.onChange} />}
        />
        <Controller
          control={control}
          name="usCitizenship"
          render={({ field }) => <SegmentedToggle label={t("fields.usCitizen")} value={!!field.value} onChange={field.onChange} />}
        />
        <Controller
          control={control}
          name="europeanCitizenship"
          render={({ field }) => (
            <SegmentedToggle label={t("fields.europeanCitizen")} value={!!field.value} onChange={field.onChange} />
          )}
        />

        <Controller
          control={control}
          name="originCountries"
          render={({ field }) => (
            <ChipGroup
              label={t("fields.originCountries")}
              options={ORIGIN_COUNTRIES}
              value={field.value ?? []}
              onChange={field.onChange}
              max={ORIGIN_MAX_SELECTIONS}
              otherOption={{ value: ORIGIN_OTHER, placeholder: t("fields.typeCountry") }}
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
              <Ionicons name={field.value === true ? "checkbox" : "square-outline"} size={22} color="#D9663D" />
              <Text className="flex-1 text-sm text-ink-700 dark:text-ink-200">
                {t("fields.consentOriginCountries")}
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
              label={t("fields.travelFrequency")}
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
              label={t("fields.travelStyle")}
              options={TRAVEL_STYLES}
              value={field.value ?? []}
              onChange={field.onChange}
              namespace="travelStyles"
            />
          )}
        />

        <BranchingQuestionsFields control={control} errors={errors} connectionTypes={watchedConnectionTypes} />

        <View className="mt-4">
          <Button
            label={saveProfileEdit.isPending ? t("common.saving") : t("common.saveChanges")}
            disabled={saveProfileEdit.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
