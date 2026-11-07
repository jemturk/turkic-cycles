import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Href } from "expo-router";

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
import { Text } from "@/components/Text";
import { StepSlider } from "@/components/StepSlider";
import { ChipGroup } from "@/components/ChipGroup";
import type { Tables } from "@/types/database";
import { SubPage, Card } from "@/components/SettingsUI";
import { TAG_TONES } from "@/constants/tagTones";
import { showAlert } from "@/lib/alert";
import { goUp } from "@/lib/goUp";

type FormProps = {
  preferences: Tables<"matching_preferences"> | null | undefined;
  userId: string | undefined;
  // km outside the US/UK; stored in miles either way.
  unit: DistanceUnit;
  parent: Href;
};

// Initial state is captured lazily from `preferences` on this component's first (and
// only relevant) render -- the parent only mounts it once loading is done, so there's
// no async-data-arrives-later case to handle with an effect.
function MatchingPreferencesForm({ preferences, userId, unit, parent }: FormProps) {
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
  const noDistance = stops.length - 1;
  const filtered = ages[0] !== 0 || ages[1] !== AGE_STOPS - 1 || distance[0] !== noDistance || languages.length > 0;
  function reset() {
    setAges([0, AGE_STOPS - 1]);
    setDistance([noDistance]);
    setLanguages([]);
  }

  // Back to where it was opened from once saved, like Edit profile: leaving the page is
  // the confirmation.
  function onSave() {
    upsert.mutate(
      {
        ...agesFromIndexes(ages),
        maxDistanceMiles: milesFromIndex(distance[0], unit),
        languages,
      },
      {
        onSuccess: () => goUp(parent),
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

      <View className="mt-2 items-center gap-3">
        <Button
          label={upsert.isPending ? t("common.saving") : t("settings.matchingPreferencesScreen.save")}
          disabled={upsert.isPending}
          onPress={onSave}
        />
        {/* Back to no filters in the form; Save stores it, so it can still be backed out of. */}
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          disabled={!filtered}
          onPress={reset}
          className={`rounded-full px-4 py-2 web:hover:bg-primary-50 dark:web:hover:bg-ink-800 ${filtered ? "" : "opacity-40"}`}
        >
          <Text className="text-sm font-semibold text-primary-500">{t("settings.matchingPreferencesScreen.reset")}</Text>
        </Pressable>
      </View>
    </>
  );
}

// Matching preferences (Discover's filters). Opened from Settings and from the Discover
// decks' filter buttons; `parent` is where Back and Save go up to.
export function MatchingPreferencesScreen({ parent }: { parent: Href }) {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: preferences, isLoading } = useMatchingPreferences(userId);
  const { data: profile, isLoading: profileLoading } = useMyProfile(userId);

  return (
    <SubPage
      title={t("settings.matchingPreferencesScreen.heading")}
      subtitle={t("settings.matchingPreferencesScreen.filtersNote")}
      parent={parent}
      form
    >
      {/* Until the session loads the queries are disabled, which v5 doesn't count as
          loading; the form would start (and save) from the defaults. */}
      {!userId || isLoading || profileLoading ? null : (
        <Card>
          <MatchingPreferencesForm
            preferences={preferences}
            userId={userId}
            unit={distanceUnitFor(profile?.country)}
            parent={parent}
          />
        </Card>
      )}
    </SubPage>
  );
}
