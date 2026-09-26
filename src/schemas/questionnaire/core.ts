import { z } from "zod";

import { CONNECTION_TYPES } from "@/constants/connectionTypes";
import { AGE_BUCKETS, TRAVEL_FREQUENCIES, TRAVEL_STYLES } from "@/constants/interests";

// Onboarding step 1: what they're looking for + location + age bucket.
export const onboardingStep1Schema = z.object({
  connectionTypes: z.array(z.enum(CONNECTION_TYPES)).min(1, "Select at least one"),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  ageBucket: z.enum(AGE_BUCKETS),
});
export type OnboardingStep1 = z.infer<typeof onboardingStep1Schema>;

// Onboarding step 2: languages, interests, hobbies, occupation.
export const onboardingStep2Schema = z.object({
  languages: z.array(z.string()).min(1, "Select at least one language"),
  interests: z.array(z.string()).default([]),
  hobbies: z.array(z.string()).default([]),
  occupation: z.string().min(1),
});
export type OnboardingStep2 = z.infer<typeof onboardingStep2Schema>;

// Onboarding step 3: residency/citizenship, origin (sensitive), travel style.
export const onboardingStep3Schema = z.object({
  usResidency: z.boolean().default(false),
  usCitizenship: z.boolean().default(false),
  europeanCitizenship: z.boolean().default(false),
  originCountries: z.array(z.string()).min(1).max(3),
  travelFrequency: z.enum(TRAVEL_FREQUENCIES.map((f) => f.value) as [string, ...string[]]),
  travelStyle: z.array(z.enum(TRAVEL_STYLES)).default([]),
});
export type OnboardingStep3 = z.infer<typeof onboardingStep3Schema>;

// The shared "core" questionnaire persisted to questionnaire_responses.core (jsonb).
export const coreQuestionnaireSchema = onboardingStep2Schema.merge(
  onboardingStep3Schema.omit({ originCountries: true })
);
export type CoreQuestionnaire = z.infer<typeof coreQuestionnaireSchema>;
