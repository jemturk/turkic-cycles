import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, useWatch, useController, Controller, type Resolver } from "react-hook-form";
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
import { TRAVEL_FREQUENCIES, TRAVEL_STYLES } from "@/constants/interests";
import { InterestsPicker } from "@/components/InterestsPicker";
import { ORIGIN_COUNTRIES, ORIGIN_MAX_SELECTIONS, ORIGIN_OTHER } from "@/constants/origins";
import { canonicalCountry } from "@/constants/countries";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import { SingleSelectChips } from "@/components/SingleSelectChips";
import { SegmentedToggle } from "@/components/SegmentedToggle";
import { BranchingQuestionsFields } from "@/components/BranchingQuestionsFields";
import { FormScrollView } from "@/components/FormScrollView";
import { LocationFields } from "@/components/LocationFields";
import { useWideLayout } from "@/hooks/useWideLayout";
import { containsEmail, containsPhoneNumber } from "@/lib/contactInfo";
import { useProfilePhotos } from "@/hooks/useGallery";
import { OwnPhotos } from "@/components/OwnPhotos";
import { TAG_TONES } from "@/constants/tagTones";

const resolver: Resolver<ProfileEditValues> = (values, context, options) =>
  zodResolver(buildProfileEditSchema(values.connectionTypes ?? []))(values, context, options);

export default function ProfileEdit() {
  const { t } = useTranslation();
  const wide = useWideLayout();
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
  const { data: photos } = useProfilePhotos(userId);

  const isLoading = profileLoading || connectionTypesLoading || questionnaireLoading || sensitiveLoading;

  const values = useMemo<ProfileEditValues | undefined>(() => {
    if (!profile) return undefined;
    const core = (questionnaire?.core ?? {}) as Record<string, unknown>;
    const answers = (questionnaire?.answers ?? {}) as Record<string, unknown>;
    const originCountries = sensitive?.origin_countries ?? [];
    return {
      displayName: profile.display_name ?? "",
      connectionTypes: connectionTypes ?? [],
      city: profile.realCity ?? "",
      state: profile.realState ?? "",
      country: canonicalCountry(profile.country),
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
  const bioValue = useWatch({ control, name: "bio" });
  const country = useController({ control, name: "country" });
  const city = useController({ control, name: "city" });
  const state = useController({ control, name: "state" });

  const onSubmit = (formValues: ProfileEditValues) => {
    saveProfileEdit.mutate(formValues, { onSuccess: () => router.back() });
  };

  if (isLoading || !values) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-primary-50 dark:bg-ink-950">
        <ActivityIndicator color="#127A87" />
      </SafeAreaView>
    );
  }

  const nameField = (
    <>
      <Controller
        control={control}
        name="displayName"
        render={({ field }) => (
          <TextField
            label={t("fields.yourName")}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.displayName?.message}
          />
        )}
      />
    </>
  );

  const bioField = (
    <>
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
      {/* A reminder, not a block: contact details belong in chat, not on a public profile. */}
      {containsPhoneNumber(bioValue ?? "") || containsEmail(bioValue ?? "") ? (
        <Text className="-mt-2 text-xs text-ink-500 dark:text-ink-300">{t("fields.bioContactHint")}</Text>
      ) : null}
    </>
  );

  const lookingForField = (
    <>
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
    </>
  );

  const locationField = (
    <>
      <LocationFields
        country={country.field.value}
        city={city.field.value}
        state={state.field.value}
        onCountryChange={country.field.onChange}
        onCityChange={city.field.onChange}
        onStateChange={state.field.onChange}
        errors={{ country: errors.country?.message, city: errors.city?.message, state: errors.state?.message }}
      />
    </>
  );

  // Your profile picture and the same gallery as on your profile. Both save each
  // change as it's made, not with the form's Save changes.
  const photosField = userId ? (
    <OwnPhotos userId={userId} avatarUrl={profile?.avatar_url} name={profile?.display_name} photos={photos} />
  ) : null;

  const occupationField = (
    <>
      <Controller
        control={control}
        name="occupation"
        render={({ field }) => (
          <TextField
            label={t("fields.occupation")}
            value={field.value}
            onChangeText={field.onChange}
            error={errors.occupation?.message}
          />
        )}
      />
    </>
  );

  const languagesField = (
    <>
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
            tone={TAG_TONES.languages}
          />
        )}
      />
    </>
  );

  const interestsField = (
    <>
      <Controller
        control={control}
        name="interests"
        render={({ field }) => (
          <InterestsPicker
            label={t("fields.interests")}
            value={field.value ?? []}
            onChange={field.onChange}
            error={errors.interests ? t("fields.interestsMin") : undefined}
            tone={TAG_TONES.interests}
          />
        )}
      />
    </>
  );

  const usResidencyField = (
    <>
      <Controller
        control={control}
        name="usResidency"
        render={({ field }) => (
          <SegmentedToggle label={t("fields.usResident")} value={!!field.value} onChange={field.onChange} />
        )}
      />
    </>
  );

  const usCitizenshipField = (
    <>
      <Controller
        control={control}
        name="usCitizenship"
        render={({ field }) => (
          <SegmentedToggle label={t("fields.usCitizen")} value={!!field.value} onChange={field.onChange} />
        )}
      />
    </>
  );

  const europeanCitizenshipField = (
    <>
      <Controller
        control={control}
        name="europeanCitizenship"
        render={({ field }) => (
          <SegmentedToggle label={t("fields.europeanCitizen")} value={!!field.value} onChange={field.onChange} />
        )}
      />
    </>
  );

  const originCountriesField = (
    <>
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
            tone={TAG_TONES.originCountries}
          />
        )}
      />
    </>
  );

  const consentField = (
    <>
      <Controller
        control={control}
        name="consentOriginCountries"
        render={({ field }) => (
          <Pressable
            className="flex-row items-start gap-2"
            onPress={() => field.onChange(field.value === true ? undefined : true)}
          >
            <Ionicons name={field.value === true ? "checkbox" : "square-outline"} size={22} color="#127A87" />
            <Text className="flex-1 text-sm text-ink-700 dark:text-ink-200">{t("fields.consentOriginCountries")}</Text>
          </Pressable>
        )}
      />
    </>
  );

  const consentErrorField = (
    <>
      {errors.consentOriginCountries?.message ? (
        <Text className="-mt-2 text-xs text-accent-600">{errors.consentOriginCountries.message}</Text>
      ) : null}
    </>
  );

  const travelFrequencyField = (
    <>
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
    </>
  );

  const travelStyleField = (
    <>
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
            tone={TAG_TONES.travelStyles}
          />
        )}
      />
    </>
  );

  const branchingField = (
    <>
      <BranchingQuestionsFields control={control} errors={errors} connectionTypes={watchedConnectionTypes} />
    </>
  );

  const saveButton = (
    <Button
      label={saveProfileEdit.isPending ? t("common.saving") : t("common.saveChanges")}
      disabled={saveProfileEdit.isPending}
      onPress={handleSubmit(onSubmit)}
    />
  );

  const phoneCard = "gap-4 rounded-[22px] bg-white p-5 dark:bg-ink-800";

  // Desktop web: a title row with Save, and the fields grouped into white cards in
  // two columns, against the sidebar like the other screens.
  if (wide) {
    const card = "gap-4 rounded-[22px] bg-white p-6 dark:bg-ink-800";
    return (
      <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
        <FormScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-20 pb-12 pt-9"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center gap-4">
            <Pressable
              accessibilityLabel={t("common.back")}
              hitSlop={8}
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full web:hover:bg-white dark:web:hover:bg-ink-800"
            >
              <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
            </Pressable>
            <Text className="flex-1 font-display text-4xl text-ink-900 dark:text-ink-50">
              {t("fields.editProfileHeading")}
            </Text>
            <View className="w-48">{saveButton}</View>
          </View>

          <View className="flex-row items-start gap-6">
            <View className="flex-1 gap-4">
              <View className={card}>
                {nameField}
                {bioField}
                {occupationField}
              </View>
              <View className={card}>{locationField}</View>
              <View className={card}>
                {lookingForField}
                {branchingField}
              </View>
            </View>
            <View className="flex-1 gap-4">
              <View className={card}>{photosField}</View>
              <View className={card}>
                {languagesField}
                {interestsField}
              </View>
              <View className={card}>
                {travelFrequencyField}
                {travelStyleField}
              </View>
              <View className={card}>
                {usResidencyField}
                {usCitizenshipField}
                {europeanCitizenshipField}
                {originCountriesField}
                {consentField}
                {consentErrorField}
              </View>
            </View>
          </View>
        </FormScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      {/* The desktop layout's cards, stacked in one column. */}
      <FormScrollView className="flex-1 px-4 pt-4" contentContainerClassName="gap-4 pb-10">
        <View className="gap-2">
          <Pressable
            accessibilityLabel={t("common.back")}
            hitSlop={8}
            onPress={() => router.back()}
            className="-ml-2 h-10 w-10 items-center justify-center rounded-full"
          >
            <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
          </Pressable>
          <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">{t("fields.editProfileHeading")}</Text>
        </View>

        <View className={phoneCard}>
          {nameField}
          {bioField}
          {occupationField}
        </View>
        <View className={phoneCard}>{photosField}</View>
        <View className={phoneCard}>
          {lookingForField}
          {branchingField}
        </View>
        <View className={phoneCard}>{locationField}</View>
        <View className={phoneCard}>
          {languagesField}
          {interestsField}
        </View>
        <View className={phoneCard}>
          {travelFrequencyField}
          {travelStyleField}
        </View>
        <View className={phoneCard}>
          {usResidencyField}
          {usCitizenshipField}
          {europeanCitizenshipField}
          {originCountriesField}
          {consentField}
          {consentErrorField}
        </View>
        <View className="mt-2">{saveButton}</View>
      </FormScrollView>
    </SafeAreaView>
  );
}
