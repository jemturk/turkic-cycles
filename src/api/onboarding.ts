import { supabase } from "@/api/client";
import type { Json } from "@/types/database";
import type { ConnectionType } from "@/constants/connectionTypes";
import type {
  CoreQuestionnaire,
  OnboardingStep1,
  OnboardingStep2,
  OnboardingStep3,
} from "@/schemas/questionnaire/core";
import type { Step4Answers } from "@/schemas/questionnaire/step4";
import type { ProfileEditValues } from "@/schemas/questionnaire/profileEdit";
import { completeOnboarding, updateProfileFields } from "@/api/profiles";
import { sensitiveConsents } from "@/lib/sensitiveConsent";

export async function updateConnectionTypes(userId: string, types: ConnectionType[]) {
  const { error: deleteError } = await supabase
    .from("user_connection_types")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  if (types.length === 0) return;

  const { error: insertError } = await supabase
    .from("user_connection_types")
    .insert(types.map((connection_type) => ({ user_id: userId, connection_type })));
  if (insertError) throw insertError;
}

export async function submitOnboardingStep1(userId: string, values: OnboardingStep1) {
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: values.displayName,
      birthdate: values.birthdate,
      city: values.city,
      state: values.state,
      country: values.country,
      onboarding_step: 2,
    })
    .eq("id", userId);
  if (error) throw error;

  await updateConnectionTypes(userId, values.connectionTypes);
}

export async function upsertQuestionnaireCore(userId: string, core: Partial<CoreQuestionnaire>) {
  const { error } = await supabase
    .from("questionnaire_responses")
    .upsert({ user_id: userId, core }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function upsertQuestionnaireAnswers(userId: string, answers: Partial<Step4Answers>) {
  const { error } = await supabase
    .from("questionnaire_responses")
    // Each type's answers are plain JSON (validated by its schema before saving).
    .upsert({ user_id: userId, answers: answers as Json }, { onConflict: "user_id" });
  if (error) throw error;
}

// Shared by onboarding step-3 and profile-edit: origin_countries lives in its own
// self-only table with a consent trail (never a direct grant to other users).
export async function updateOriginCountriesWithConsent(userId: string, originCountries: string[]) {
  const { error: sensitiveError } = await supabase
    .from("profile_sensitive")
    .upsert({ user_id: userId, origin_countries: originCountries }, { onConflict: "user_id" });
  if (sensitiveError) throw sensitiveError;

  // Schema already guarantees consentOriginCountries is true by the time this runs.
  const { error: consentError } = await supabase.from("consent_records").insert({
    user_id: userId,
    field_key: "origin_countries",
    granted: true,
    purpose: "matching",
  });
  if (consentError) throw consentError;
}

// Saves the branching answers and logs the special category consents they carry
// (consent_records is append-only: a withdrawal is a new granted=false row).
async function saveAnswersWithConsent(userId: string, answers: Partial<Step4Answers>, connectionTypes: ConnectionType[]) {
  const { saved, granted, revoked } = sensitiveConsents(answers, connectionTypes);
  await upsertQuestionnaireAnswers(userId, saved);

  const now = new Date().toISOString();
  const rows = [
    ...granted.map((field_key) => ({ user_id: userId, field_key, granted: true, purpose: "matching" })),
    ...revoked.map((field_key) => ({ user_id: userId, field_key, granted: false, purpose: "matching", revoked_at: now })),
  ];
  if (rows.length === 0) return;
  const { error } = await supabase.from("consent_records").insert(rows);
  if (error) throw error;
}

export async function submitOnboardingStep2(
  userId: string,
  values: OnboardingStep2,
  corePayload: Partial<CoreQuestionnaire>
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      languages: values.languages,
      interests: values.interests,
      hobbies: values.hobbies,
      occupation: values.occupation,
      meeting_format: values.meetingFormat,
      availability: values.availability,
      onboarding_step: 3,
    })
    .eq("id", userId);
  if (error) throw error;

  await upsertQuestionnaireCore(userId, corePayload);
}

export async function submitOnboardingStep3(
  userId: string,
  values: OnboardingStep3,
  corePayload: Partial<CoreQuestionnaire>
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      travel_frequency: values.travelFrequency,
      travel_style: values.travelStyle,
      us_residency: values.usResidency,
      us_citizenship: values.usCitizenship,
      european_citizenship: values.europeanCitizenship,
      onboarding_step: 4,
    })
    .eq("id", userId);
  if (error) throw error;

  await upsertQuestionnaireCore(userId, corePayload);
  await updateOriginCountriesWithConsent(userId, values.originCountries);
}

export async function submitOnboardingStep4(
  userId: string,
  answers: Partial<Step4Answers>,
  connectionTypes: ConnectionType[]
) {
  await saveAnswersWithConsent(userId, answers, connectionTypes);
  await updateProfileFields(userId, { onboarding_step: 5 });
}

// Step 5 (photos) uploads as you pick, so finishing is just the completion stamp.
// The database refuses it without a profile picture and one gallery photo
// (migration 0026), so the app's own check can't be skipped.
export async function submitOnboardingPhotosAndComplete(userId: string) {
  await completeOnboarding(userId);
}

// Composite save for the profile-edit screen: touches every table the onboarding
// wizard writes to, in one call, since edit is a single form rather than a wizard.
export async function saveProfileEdit(userId: string, values: ProfileEditValues) {
  await updateProfileFields(userId, {
    display_name: values.displayName,
    bio: values.bio || null,
    birthdate: values.birthdate,
    city: values.city,
    state: values.state,
    country: values.country,
    languages: values.languages,
    interests: values.interests,
    hobbies: values.hobbies,
    occupation: values.occupation,
    meeting_format: values.meetingFormat,
    availability: values.availability,
    travel_frequency: values.travelFrequency,
    travel_style: values.travelStyle,
    us_residency: values.usResidency,
    us_citizenship: values.usCitizenship,
    european_citizenship: values.europeanCitizenship,
  });

  await updateConnectionTypes(userId, values.connectionTypes);
  await updateOriginCountriesWithConsent(userId, values.originCountries);

  const corePayload: Partial<CoreQuestionnaire> = {
    languages: values.languages,
    interests: values.interests,
    hobbies: values.hobbies,
    occupation: values.occupation,
    usResidency: values.usResidency,
    usCitizenship: values.usCitizenship,
    europeanCitizenship: values.europeanCitizenship,
    travelFrequency: values.travelFrequency,
    travelStyle: values.travelStyle,
  };
  await upsertQuestionnaireCore(userId, corePayload);

  const { values: valuesAnswers, friend, romantic, business, business_mentor, academic_mentor, spiritual_mentor } = values;
  await saveAnswersWithConsent(
    userId,
    { values: valuesAnswers, friend, romantic, business, business_mentor, academic_mentor, spiritual_mentor },
    values.connectionTypes
  );
}

export async function getMyConnectionTypes(userId: string): Promise<ConnectionType[]> {
  const { data, error } = await supabase
    .from("user_connection_types")
    .select("connection_type")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.connection_type as ConnectionType);
}

export async function getMyQuestionnaireResponses(userId: string) {
  const { data, error } = await supabase
    .from("questionnaire_responses")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyProfileSensitive(userId: string) {
  const { data, error } = await supabase
    .from("profile_sensitive")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
