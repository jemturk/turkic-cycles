import { View } from "react-native";
import { Text } from "@/components/Text";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { ConnectionType } from "@/constants/connectionTypes";
import { RELATIONSHIP_INTENT_LABELS, WANTS_KIDS_LABELS, IMPORTANCE_LABELS } from "@/schemas/questionnaire/romantic";
import { BUSINESS_ROLES, MENTOR_ROLES } from "@/constants/connectionTypes";
import { EXPERIENCE_LEVELS } from "@/constants/experience";
import { EXPERTISE, GOALS, INDUSTRIES, SELECTION_LIMITS, type GoalType } from "@/constants/matching";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import { SingleSelectChips } from "@/components/SingleSelectChips";

const MENTOR_TYPES = ["business_mentor", "academic_mentor", "spiritual_mentor"] as const;

type BranchingQuestionsFieldsProps = {
  // control/errors typed `any` on purpose: this component is shared by the step-4
  // wizard's Step4Answers-only form and profile-edit's much larger combined form.
  // react-hook-form's Control<T>/FieldErrors<T> resolve their internal function
  // properties (e.g. _options.validate) directly against T, not through T, so even
  // Control<any> doesn't structurally accept a concrete Control<SomeForm> — no
  // shared type lets both callers' concrete form types satisfy the same prop type.
  // Both callers already validate their own values via their own zodResolver; this
  // component just renders whatever nested fields exist.
  control: any;
  errors: any;
  connectionTypes: ConnectionType[];
};

// The friend/romantic/business/mentor question cards, shared between the onboarding
// step-4 wizard screen and the profile-edit screen — both need to render the
// same branching questionnaire, just with a different surrounding form/submit.
export function BranchingQuestionsFields({ control, errors, connectionTypes }: BranchingQuestionsFieldsProps) {
  const { t } = useTranslation();
  const showFriend = connectionTypes.includes("friend");
  const showRomantic = connectionTypes.includes("romantic");
  const showBusiness = connectionTypes.includes("business");
  const mentorTypesShown = MENTOR_TYPES.filter((type) => connectionTypes.includes(type));
  const hasBranchingQuestions = showFriend || showRomantic || showBusiness || mentorTypesShown.length > 0;

  const relationshipIntentOptions = Object.keys(RELATIONSHIP_INTENT_LABELS).map((value) => ({
    value: value as keyof typeof RELATIONSHIP_INTENT_LABELS,
    label: t(`constants.relationshipIntent.${value}`),
  }));
  const wantsKidsOptions = Object.keys(WANTS_KIDS_LABELS).map((value) => ({
    value: value as keyof typeof WANTS_KIDS_LABELS,
    label: t(`constants.wantsKids.${value}`),
  }));
  const importanceOptions = Object.keys(IMPORTANCE_LABELS).map((value) => ({
    value: value as keyof typeof IMPORTANCE_LABELS,
    label: t(`constants.importance.${value}`),
  }));
  const businessRoleOptions = BUSINESS_ROLES.map((value) => ({
    value,
    label: t(`constants.businessRoles.${value}`),
  }));
  const mentorRoleOptions = MENTOR_ROLES.map((value) => ({ value, label: t(`constants.mentorRoles.${value}`) }));
  const experienceLevelOptions = EXPERIENCE_LEVELS.map((level) => ({
    value: level.value,
    label: t(`constants.experienceLevels.${level.value}`),
  }));

  const industryOptions = INDUSTRIES.map((value) => ({ value, label: t(`constants.industries.${value}`) }));
  const expertiseOptions = EXPERTISE.map((value) => ({ value, label: t(`constants.expertise.${value}`) }));

  // The matching model's goals for one type, 1 to 3 of them.
  const goalsField = (type: GoalType) => (
    <Controller
      control={control}
      name={`${type}.goals`}
      render={({ field }) => (
        <ChipGroup
          label={t("branching.goals")}
          options={GOALS[type].map((value) => ({ value, label: t(`constants.goals.${value}`) }))}
          value={field.value ?? []}
          onChange={field.onChange}
          max={SELECTION_LIMITS.goals.max}
          error={errors[type]?.goals ? t("branching.goalsRequired") : undefined}
        />
      )}
    />
  );

  if (!hasBranchingQuestions) {
    return <Text className="text-base text-ink-700 dark:text-ink-200">{t("branching.allSet")}</Text>;
  }

  return (
    <>
      {showFriend ? (
        <View className="gap-4 rounded-2xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
          <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{t("branching.friendTitle")}</Text>
          {goalsField("friend")}
        </View>
      ) : null}

      {showRomantic ? (
        <View className="gap-4 rounded-2xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
          <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{t("branching.romanticTitle")}</Text>
          <Controller
            control={control}
            name="romantic.relationshipIntent"
            render={({ field }) => (
              <SingleSelectChips
                label={t("branching.lookingFor")}
                options={relationshipIntentOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.romantic?.relationshipIntent?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="romantic.wantsKids"
            render={({ field }) => (
              <SingleSelectChips
                label={t("branching.kids")}
                options={wantsKidsOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.romantic?.wantsKids?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="romantic.sharedReligionImportance"
            render={({ field }) => (
              <SingleSelectChips
                label={t("branching.religionImportance")}
                options={importanceOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.romantic?.sharedReligionImportance?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="romantic.sharedCultureImportance"
            render={({ field }) => (
              <SingleSelectChips
                label={t("branching.cultureImportance")}
                options={importanceOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.romantic?.sharedCultureImportance?.message}
              />
            )}
          />
          {goalsField("romantic")}
        </View>
      ) : null}

      {showBusiness ? (
        <View className="gap-4 rounded-2xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
          <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{t("branching.businessTitle")}</Text>
          <Controller
            control={control}
            name="business.roles"
            render={({ field }) => (
              <ChipGroup
                label={t("branching.businessConnectionKind")}
                options={businessRoleOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                error={errors.business?.roles?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="business.industry"
            render={({ field }) => (
              <SingleSelectChips
                label={t("branching.industry")}
                options={industryOptions}
                // An answer from before the list (free text) isn't one of the options.
                value={INDUSTRIES.includes(field.value) ? field.value : undefined}
                onChange={field.onChange}
                error={errors.business?.industry ? t("branching.industryRequired") : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="business.experienceLevel"
            render={({ field }) => (
              <SingleSelectChips
                label={t("branching.experienceLevel")}
                options={experienceLevelOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.business?.experienceLevel?.message}
              />
            )}
          />
          {goalsField("business")}
          <Controller
            control={control}
            name="business.expertiseOffered"
            render={({ field }) => (
              <ChipGroup
                label={t("branching.expertiseOffered")}
                options={expertiseOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                max={SELECTION_LIMITS.expertise.max}
                error={errors.business?.expertiseOffered ? t("branching.expertiseRequired") : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="business.expertiseSought"
            render={({ field }) => (
              <ChipGroup
                label={t("branching.expertiseSought")}
                options={expertiseOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                max={SELECTION_LIMITS.expertise.max}
              />
            )}
          />
        </View>
      ) : null}

      {mentorTypesShown.map((type) => (
        <View key={type} className="gap-4 rounded-2xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
          <Text className="font-display text-xl text-ink-900 dark:text-ink-50">
            {t(`branching.mentorTypes.${type}`)}
          </Text>
          <Controller
            control={control}
            name={`${type}.role`}
            render={({ field }) => (
              <SingleSelectChips
                label={t("branching.seekingOrOffering")}
                options={mentorRoleOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors[type]?.role?.message}
              />
            )}
          />
          <Controller
            control={control}
            name={`${type}.field`}
            render={({ field }) => (
              <TextField
                label={t("branching.field")}
                value={field.value ?? ""}
                onChangeText={field.onChange}
                error={errors[type]?.field?.message}
              />
            )}
          />
          <Controller
            control={control}
            name={`${type}.experienceLevel`}
            render={({ field }) => (
              <SingleSelectChips
                label={t("branching.experienceLevel")}
                options={experienceLevelOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors[type]?.experienceLevel?.message}
              />
            )}
          />
        </View>
      ))}
    </>
  );
}
