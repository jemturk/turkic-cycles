import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSession } from "@/hooks/useSession";
import { useMatchingPreferences, useUpsertMatchingPreferences } from "@/hooks/useSettings";
import { LANGUAGES, LANGUAGE_OTHER } from "@/constants/languages";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ChipGroup } from "@/components/ChipGroup";
import type { Tables } from "@/types/database";

type FormProps = {
  preferences: Tables<"matching_preferences"> | null | undefined;
  userId: string | undefined;
};

// Initial state is captured lazily from `preferences` on this component's first (and
// only relevant) render -- the parent only mounts it once loading is done, so there's
// no async-data-arrives-later case to handle with an effect.
function MatchingPreferencesForm({ preferences, userId }: FormProps) {
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
          <TextField label="Age min" keyboardType="number-pad" value={ageMin} onChangeText={setAgeMin} />
        </View>
        <View className="flex-1">
          <TextField label="Age max" keyboardType="number-pad" value={ageMax} onChangeText={setAgeMax} />
        </View>
      </View>

      <TextField
        label="Max distance (miles)"
        keyboardType="number-pad"
        value={maxDistance}
        onChangeText={setMaxDistance}
      />

      <ChipGroup
        label="Show me speakers of"
        options={LANGUAGES}
        value={languages}
        onChange={setLanguages}
        otherOption={{ value: LANGUAGE_OTHER, placeholder: "Type a language" }}
      />

      <View className="mt-2">
        <Button label={upsert.isPending ? "Saving..." : "Save"} disabled={upsert.isPending} onPress={onSave} />
      </View>
    </>
  );
}

export default function MatchingPreferences() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: preferences, isLoading } = useMatchingPreferences(userId);

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#2B2320" />
        </Pressable>

        <Text className="font-display text-2xl text-ink-900">Matching preferences</Text>
        <Text className="-mt-2 text-sm text-ink-400">
          These don&apos;t filter Discover yet — they&apos;re saved for when that&apos;s wired up.
        </Text>

        {isLoading ? null : <MatchingPreferencesForm preferences={preferences} userId={userId} />}
      </ScrollView>
    </SafeAreaView>
  );
}
