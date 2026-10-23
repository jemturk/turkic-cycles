import { z } from "zod";

import { CONNECTION_TYPES } from "@/constants/connectionTypes";
import { matchRegionOption, regionConfigFor } from "@/constants/countries";
import { TRAVEL_FREQUENCIES, TRAVEL_STYLES } from "@/constants/interests";
import { calculateAge } from "@/lib/age";

// Onboarding step 1: what they're looking for + location + real DOB (never a
// self-reported age bucket — profiles.birthdate is the trusted source; any age
// bucket shown in the UI is derived from it client-side, see src/lib/age.ts).
export const onboardingStep1Schema = z.object({
  displayName: z.string().min(1, "Enter your name"),
  connectionTypes: z.array(z.enum(CONNECTION_TYPES)).min(1, "Select at least one"),
  city: z.string().trim().min(1, "Enter your city"),
  // Required only for countries with a fixed state/province list -- see
  // requireRegionForCountry, applied wherever this schema is used as a form.
  state: z.string(),
  country: z.string().min(1, "Select your country"),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine((v) => calculateAge(v) >= 18, "You must be 18 or older")
    .refine((v) => calculateAge(v) <= 100, "Enter a valid birthdate"),
});
export type OnboardingStep1 = z.infer<typeof onboardingStep1Schema>;

// State/province is required (and must be on the list) for countries whose
// LocationFields show a picker -- US, Canada, Australia -- and optional elsewhere.
// A separate refinement rather than part of onboardingStep1Schema itself: Zod
// won't .merge() an object that already has refinements, and the profile-edit
// schema merges this one.
export function requireRegionForCountry(values: { country: string; state: string }, ctx: z.RefinementCtx) {
  const region = regionConfigFor(values.country);
  if (region.kind === "list" && !matchRegionOption(region.options, values.state)) {
    ctx.addIssue({ code: "custom", path: ["state"], message: "Select one from the list" });
  }
}

export const onboardingStep1FormSchema = onboardingStep1Schema.superRefine(requireRegionForCountry);

// Onboarding step 2: languages, interests, hobbies, occupation.
export const onboardingStep2Schema = z.object({
  languages: z.array(z.string()).min(1, "Select at least one language"),
  // No .default([]) on these: a zod default makes the field optional in the
  // resolver's *input* type while z.infer's *output* type keeps it required,
  // which breaks @hookform/resolvers' Resolver<> typing against useForm<T>'s
  // output-typed T. Initial "[]" is supplied via each form's defaultValues instead.
  interests: z.array(z.string()),
  hobbies: z.array(z.string()),
  occupation: z.string().min(1),
});
export type OnboardingStep2 = z.infer<typeof onboardingStep2Schema>;

// Onboarding step 3: residency/citizenship, origin (sensitive), travel style.
export const onboardingStep3Schema = z.object({
  // No .default(...) on these — see the comment on onboardingStep2Schema above;
  // initial values come from each form's defaultValues instead.
  usResidency: z.boolean(),
  usCitizenship: z.boolean(),
  europeanCitizenship: z.boolean(),
  originCountries: z.array(z.string()).min(1).max(3),
  // Required consent checkbox — schema-enforced rather than ad hoc UI logic, since
  // origin_countries is a sensitive field per profile_sensitive's consent design.
  consentOriginCountries: z.literal(true, "Consent is required to store origin country info"),
  travelFrequency: z.enum(TRAVEL_FREQUENCIES.map((f) => f.value) as [string, ...string[]]),
  travelStyle: z.array(z.enum(TRAVEL_STYLES)),
});
export type OnboardingStep3 = z.infer<typeof onboardingStep3Schema>;

// The shared "core" questionnaire persisted to questionnaire_responses.core (jsonb).
// originCountries/consentOriginCountries are deliberately excluded: origin lives in
// profile_sensitive (its own consent trail), and consent itself is an audit field, not
// a questionnaire answer — neither belongs in this jsonb blob.
export const coreQuestionnaireSchema = onboardingStep2Schema.merge(
  onboardingStep3Schema.omit({ originCountries: true, consentOriginCountries: true })
);
export type CoreQuestionnaire = z.infer<typeof coreQuestionnaireSchema>;
