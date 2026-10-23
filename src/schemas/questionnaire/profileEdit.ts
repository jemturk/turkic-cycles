import { z } from "zod";

import type { ConnectionType } from "@/constants/connectionTypes";
import { onboardingStep1Schema, onboardingStep2Schema, onboardingStep3Schema, requireRegionForCountry } from "./core";
import { buildStep4Schema } from "./step4";

const bioSchema = z.object({ bio: z.string().optional() });

// Everything the onboarding wizard collects across 4 steps, flattened into one
// form for the profile-edit screen, plus `bio` (which onboarding never asks —
// this screen is its first home) and the branching answers for whichever
// connection types are currently selected in the same form.
export function buildProfileEditSchema(connectionTypes: ConnectionType[]) {
  return onboardingStep1Schema
    .merge(onboardingStep2Schema)
    .merge(onboardingStep3Schema)
    .merge(bioSchema)
    .merge(buildStep4Schema(connectionTypes))
    .superRefine(requireRegionForCountry);
}

export type ProfileEditValues = z.infer<ReturnType<typeof buildProfileEditSchema>>;
