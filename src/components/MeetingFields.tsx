import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { AVAILABILITY, MEETING_FORMATS } from "@/constants/matching";
import type { TagTone } from "@/constants/tagTones";
import { ChipGroup } from "@/components/ChipGroup";
import { SingleSelectChips } from "@/components/SingleSelectChips";

type MeetingFieldsProps = {
  // control/errors typed `any` for the same reason as BranchingQuestionsFields: shared
  // by onboarding step 2's form and Edit profile's larger one.
  control: any;
  errors: any;
  /** Selected chips in this soft tint instead of solid teal (Edit profile). */
  tone?: TagTone;
};

// How and when someone likes to meet -- the matching model's Meeting format &
// availability (profiles.meeting_format, profiles.availability). Format is required.
export function MeetingFields({ control, errors, tone }: MeetingFieldsProps) {
  const { t } = useTranslation();
  const formatOptions = MEETING_FORMATS.map((value) => ({ value, label: t(`constants.meetingFormats.${value}`) }));
  const availabilityOptions = AVAILABILITY.map((value) => ({ value, label: t(`constants.availability.${value}`) }));

  return (
    <>
      <Controller
        control={control}
        name="meetingFormat"
        render={({ field }) => (
          <SingleSelectChips
            label={t("fields.meetingFormat")}
            options={formatOptions}
            value={field.value}
            onChange={field.onChange}
            error={errors.meetingFormat ? t("fields.meetingFormatRequired") : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="availability"
        render={({ field }) => (
          <ChipGroup
            label={t("fields.availability")}
            options={availabilityOptions}
            value={field.value ?? []}
            onChange={field.onChange}
            tone={tone}
          />
        )}
      />
    </>
  );
}
