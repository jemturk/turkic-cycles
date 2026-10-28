import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { useSession } from "@/hooks/useSession";
import { useMatchingPreferences, useUpsertMatchingPreferences } from "@/hooks/useSettings";
import { useMyProfile } from "@/hooks/useProfile";
import { distanceUnitFor, type DistanceUnit } from "@/lib/distanceUnits";
import {
  AGE_MIN,
  AGE_STOPS,
  ageToIndex,
  agesFromIndexes,
  distanceStops,
  distanceToIndex,
  milesFromIndex,
} from "@/lib/preferenceSliders";
import { LANGUAGES, LANGUAGE_OTHER } from "@/constants/languages";
import { Button } from "@/components/Button";
import { StepSlider } from "@/components/StepSlider";
import { ChipGroup } from "@/components/ChipGroup";
import type { Tables } from "@/types/database";
import { SubPage, Card } from "@/components/SettingsUI";
import { TAG_TONES } from "@/constants/tagTones";
import { showAlert } from "@/lib/alert";

type FormProps = {
  preferences: Tables<"matching_preferences"> | null | undefined;
  userId: string | undefined;
  // km outside the US/UK; stored in miles either way.
  unit: DistanceUnit;
};

// Initial state is captured lazily from `preferences` on this component's first (and
// only relevant) render -- the parent only mounts it once loading is done, so there's
// no async-data-arrives-later case to handle with an effect.
function MatchingPreferencesForm({ preferences, userId, unit }: FormProps) {
  const { t } = useTranslation();
  const upsert = useUpsertMatchingPreferences(userId);
  // Slider positions (stop indexes); the ends mean no limit.
  const [ages, setAges] = useState(() => [
    ageToIndex(preferences?.age_min, 0),
    ageToIndex(preferences?.age_max, AGE_STOPS - 1),
  ]);
  // One stop, kept as a one-item array like the age range's two.
  const [distance, setDistance] = useState(() => [distanceToIndex(preferences?.max_distance_miles, unit)]);
  const stops = distanceStops(unit);
  const ageText = (index: number) => (index === AGE_STOPS - 1 ? `${AGE_MIN + index}+` : String(AGE_MIN + index));
  const distanceText = (index: number) => {
    const stop = stops[index];
    return stop === null ? t("settings.matchingPreferencesScreen.anywhere") : `${stop} ${unit}`;
  };
  const [languages, setLanguages] = useState<string[]>(preferences?.languages ?? []);

  // Back to Settings once saved, like Edit profile: leaving the page is the confirmation.
  function onSave() {
    upsert.mutate(
      {
        ...agesFromIndexes(ages),
        maxDistanceMiles: milesFromIndex(distance[0], unit),
        languages,
      },
      {
        onSuccess: () => router.back(),
        onError: () => showAlert(t("settings.matchingPreferencesScreen.saveFailed")),
      }
    );
  }

  return (
    <>
      <StepSlider
        label={t("settings.matchingPreferencesScreen.age")}
        valueLabel={`${ageText(ages[0])} – ${ageText(ages[1])}`}
        stops={AGE_STOPS}
        value={ages}
        onChange={setAges}
        describe={ageText}
        tone="accent"
      />

      <StepSlider
        label={t("settings.matchingPreferencesScreen.distance")}
        valueLabel={distanceText(distance[0])}
        stops={stops.length}
        value={distance}
        onChange={setDistance}
        describe={distanceText}
        tone="gold"
      />

      <ChipGroup
        label={t("settings.matchingPreferencesScreen.showMeSpeakersOf")}
        options={LANGUAGES}
        value={languages}
        onChange={setLanguages}
        otherOption={{ value: LANGUAGE_OTHER, placeholder: t("fields.typeLanguage") }}
        namespace="languages"
        tone={TAG_TONES.languages}
      />

      <View className="mt-2">
        <Button
          label={upsert.isPending ? t("common.saving") : t("settings.matchingPreferencesScreen.save")}
          disabled={upsert.isPending}
          onPress={onSave}
        />
      </View>
    </>
  );
}

export default function MatchingPreferences() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: preferences, isLoading } = useMatchingPreferences(userId);
  const { data: profile, isLoading: profileLoading } = useMyProfile(userId);

  return (
    <SubPage
      title={t("settings.matchingPreferencesScreen.heading")}
      subtitle={t("settings.matchingPreferencesScreen.filtersNote")}
      form
    >
      {isLoading || profileLoading ? null : (
        <Card>
          <MatchingPreferencesForm preferences={preferences} userId={userId} unit={distanceUnitFor(profile?.country)} />
        </Card>
      )}
    </SubPage>
  );
}
