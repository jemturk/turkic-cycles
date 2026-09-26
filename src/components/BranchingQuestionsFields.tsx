import { Text, View } from "react-native";
import { Controller } from "react-hook-form";

import type { ConnectionType } from "@/constants/connectionTypes";
import {
  RELATIONSHIP_INTENT_LABELS,
  WANTS_KIDS_LABELS,
  IMPORTANCE_LABELS,
} from "@/schemas/questionnaire/romantic";
import {
  BUSINESS_ROLES,
  BUSINESS_ROLE_LABELS,
  MENTOR_ROLES,
  MENTOR_ROLE_LABELS,
} from "@/constants/connectionTypes";
import { EXPERIENCE_LEVELS } from "@/constants/experience";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import { SingleSelectChips } from "@/components/SingleSelectChips";

const RELATIONSHIP_INTENT_OPTIONS = Object.entries(RELATIONSHIP_INTENT_LABELS).map(([value, label]) => ({
  value: value as keyof typeof RELATIONSHIP_INTENT_LABELS,
  label,
}));
const WANTS_KIDS_OPTIONS = Object.entries(WANTS_KIDS_LABELS).map(([value, label]) => ({
  value: value as keyof typeof WANTS_KIDS_LABELS,
  label,
}));
const IMPORTANCE_OPTIONS = Object.entries(IMPORTANCE_LABELS).map(([value, label]) => ({
  value: value as keyof typeof IMPORTANCE_LABELS,
  label,
}));
const BUSINESS_ROLE_OPTIONS = BUSINESS_ROLES.map((value) => ({ value, label: BUSINESS_ROLE_LABELS[value] }));
const MENTOR_ROLE_OPTIONS = MENTOR_ROLES.map((value) => ({ value, label: MENTOR_ROLE_LABELS[value] }));

const MENTOR_TYPES = ["business_mentor", "academic_mentor", "spiritual_mentor"] as const;
const MENTOR_TYPE_TITLES: Record<(typeof MENTOR_TYPES)[number], string> = {
  business_mentor: "Business mentorship",
  academic_mentor: "Academic mentorship",
  spiritual_mentor: "Spiritual mentorship",
};

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

// The romantic/business/mentor question cards, shared between the onboarding
// step-4 wizard screen and the profile-edit screen — both need to render the
// same branching questionnaire, just with a different surrounding form/submit.
export function BranchingQuestionsFields({ control, errors, connectionTypes }: BranchingQuestionsFieldsProps) {
  const showRomantic = connectionTypes.includes("romantic");
  const showBusiness = connectionTypes.includes("business");
  const mentorTypesShown = MENTOR_TYPES.filter((t) => connectionTypes.includes(t));
  const hasBranchingQuestions = showRomantic || showBusiness || mentorTypesShown.length > 0;

  if (!hasBranchingQuestions) {
    return (
      <Text className="text-base text-ink-700">
        Nothing else to answer for the connection types you picked — you&apos;re all set.
      </Text>
    );
  }

  return (
    <>
      {showRomantic ? (
        <View className="gap-4 rounded-2xl border border-coral-100 bg-white p-4">
          <Text className="font-display text-xl text-ink-900">Romantic connections</Text>
          <Controller
            control={control}
            name="romantic.relationshipIntent"
            render={({ field }) => (
              <SingleSelectChips
                label="What are you looking for?"
                options={RELATIONSHIP_INTENT_OPTIONS}
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
                label="Kids?"
                options={WANTS_KIDS_OPTIONS}
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
                label="Importance of shared religion"
                options={IMPORTANCE_OPTIONS}
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
                label="Importance of shared culture"
                options={IMPORTANCE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.romantic?.sharedCultureImportance?.message}
              />
            )}
          />
        </View>
      ) : null}

      {showBusiness ? (
        <View className="gap-4 rounded-2xl border border-coral-100 bg-white p-4">
          <Text className="font-display text-xl text-ink-900">Business connections</Text>
          <Controller
            control={control}
            name="business.roles"
            render={({ field }) => (
              <ChipGroup
                label="What kind of business connection?"
                options={BUSINESS_ROLE_OPTIONS}
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
              <TextField
                label="Industry"
                value={field.value ?? ""}
                onChangeText={field.onChange}
                error={errors.business?.industry?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="business.experienceLevel"
            render={({ field }) => (
              <SingleSelectChips
                label="Experience level"
                options={EXPERIENCE_LEVELS}
                value={field.value}
                onChange={field.onChange}
                error={errors.business?.experienceLevel?.message}
              />
            )}
          />
        </View>
      ) : null}

      {mentorTypesShown.map((type) => (
        <View key={type} className="gap-4 rounded-2xl border border-coral-100 bg-white p-4">
          <Text className="font-display text-xl text-ink-900">{MENTOR_TYPE_TITLES[type]}</Text>
          <Controller
            control={control}
            name={`${type}.role`}
            render={({ field }) => (
              <SingleSelectChips
                label="Are you seeking or offering?"
                options={MENTOR_ROLE_OPTIONS}
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
                label="Field"
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
                label="Experience level"
                options={EXPERIENCE_LEVELS}
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
