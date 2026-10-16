import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMatchingPreferences, useUpsertMatchingPreferences } from "@/hooks/useSettings";
import { LANGUAGES, LANGUAGE_OTHER } from "@/constants/languages";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import type { Tables } from "@/types/database";
import { SubPage, Card } from "@/components/SettingsUI";

type FormProps = {
  preferences: Tables<"matching_preferences"> | null | undefined;
  userId: string | undefined;
};

// Initial state is captured lazily from `preferences` on this component's first (and
// only relevant) render -- the parent only mounts it once loading is done, so there's
// no async-data-arrives-later case to handle with an effect.
function MatchingPreferencesForm({ preferences, userId }: FormProps) {
  const { t } = useTranslation();
  const upsert = useUpsertMatchingPreferences(userId);
  const [ageMin, setAgeMin] = useState(preferences?.age_min?.toString() ?? "");
  const [ageMax, setAgeMax] = useState(preferences?.age_max?.toString() ?? "");
  const [maxDistance, setMaxDistance] = useState(preferences?.max_distance_miles?.toString() ?? "");
  const [languages, setLanguages] = useState<string[]>(preferences?.languages ?? []);

  function onSave() {
    upsert.mutate({
      ageMin: ageMin ? Number(ageMin) : undefined,
      ageMax: ageMax ? Number(ageMax) : undefined,
      maxDistanceMiles: maxDistance ? Number(maxDistance) : undefined,
      languages,
    });
  }

  return (
    <>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField
            label={t("settings.matchingPreferencesScreen.ageMin")}
            keyboardType="number-pad"
            value={ageMin}
            onChangeText={setAgeMin}
          />
        </View>
        <View className="flex-1">
          <TextField
            label={t("settings.matchingPreferencesScreen.ageMax")}
            keyboardType="number-pad"
            value={ageMax}
            onChangeText={setAgeMax}
          />
        </View>
      </View>

      <TextField
        label={t("settings.matchingPreferencesScreen.maxDistance")}
        keyboardType="number-pad"
        value={maxDistance}
        onChangeText={setMaxDistance}
      />

      <ChipGroup
        label={t("settings.matchingPreferencesScreen.showMeSpeakersOf")}
        options={LANGUAGES}
        value={languages}
        onChange={setLanguages}
        otherOption={{ value: LANGUAGE_OTHER, placeholder: t("fields.typeLanguage") }}
        namespace="languages"
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

  return (
    <SubPage
      title={t("settings.matchingPreferencesScreen.heading")}
      subtitle={t("settings.matchingPreferencesScreen.notWiredUp")}
      form
    >
      {isLoading ? null : (
        <Card>
          <MatchingPreferencesForm preferences={preferences} userId={userId} />
        </Card>
      )}
    </SubPage>
  );
}
