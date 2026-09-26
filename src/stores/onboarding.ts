import { create } from "zustand";

import type {
  CoreQuestionnaire,
  OnboardingStep1,
  OnboardingStep2,
  OnboardingStep3,
} from "@/schemas/questionnaire/core";
import type { Step4Answers } from "@/schemas/questionnaire/step4";

type OnboardingStore = {
  step1?: OnboardingStep1;
  step2?: OnboardingStep2;
  step3?: OnboardingStep3;
  step4Answers: Partial<Step4Answers>;
  setStep1: (v: OnboardingStep1) => void;
  setStep2: (v: OnboardingStep2) => void;
  setStep3: (v: OnboardingStep3) => void;
  setStep4Answers: (v: Partial<Step4Answers>) => void;
  reset: () => void;
};

// Plain in-memory store, deliberately NOT persisted to AsyncStorage: the root
// redirect gate only checks profiles.onboarding_completed_at (binary), so if the
// app is killed mid-wizard the user restarts at step-1 regardless — a store that
// survived a restart would only ever be read after already being irrelevant.
export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step4Answers: {},
  setStep1: (v) => set({ step1: v }),
  setStep2: (v) => set({ step2: v }),
  setStep3: (v) => set({ step3: v }),
  setStep4Answers: (v) => set({ step4Answers: v }),
  reset: () => set({ step1: undefined, step2: undefined, step3: undefined, step4Answers: {} }),
}));

// Always recomputes the full step2+step3 union — never write a step's fields to
// `core` in isolation, or going Back and resubmitting one step would silently
// wipe the other step's already-saved fields out of questionnaire_responses.core.
export function buildCorePayload(
  store: Pick<OnboardingStore, "step2" | "step3">
): Partial<CoreQuestionnaire> {
  let restStep3: Partial<CoreQuestionnaire> = {};
  if (store.step3) {
    const { originCountries: _originCountries, consentOriginCountries: _consent, ...rest } =
      store.step3;
    restStep3 = rest;
  }
  return { ...store.step2, ...restStep3 };
}
