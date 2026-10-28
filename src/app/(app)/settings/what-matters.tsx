import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Text } from "@/components/Text";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { SubPage, Card } from "@/components/SettingsUI";
import { useSession } from "@/hooks/useSession";
import { useMatchingPreferences, useSaveBoosts } from "@/hooks/useSettings";
import { useMyConnectionTypes } from "@/hooks/useOnboarding";
import { DEFAULT_CONFIG, boostableCriteria, sanitizeBoosts, type AppType, type Criterion } from "@/lib/matchingModel";
import type { Boosts } from "@/api/settings";
import { showAlert } from "@/lib/alert";

type Level = "very" | "less";
const { max_very: MAX_VERY, max_less: MAX_LESS } = DEFAULT_CONFIG.boosts;
const isMentor = (type: string) => type.endsWith("_mentor");

// "What matters most to you?" (matching model, stage 5): per connection type, up to 3
// things marked Very important and 2 Less important; everything else stays Normal. It
// changes how you score others, never how they score you. Saved as
// matching_preferences.boosts; rank-discover applies it (and its limits) on its side too.
function WhatMattersForm({ types, initial, userId }: { types: AppType[]; initial: Boosts; userId: string | undefined }) {
  const { t } = useTranslation();
  const save = useSaveBoosts(userId);
  const [boosts, setBoosts] = useState<Boosts>(initial);

  function setLevel(type: AppType, criterion: Criterion, level: Level | null) {
    setBoosts((current) => {
      const forType = { ...(current[type] ?? {}) };
      if (level) forType[criterion] = level;
      else delete forType[criterion];
      return { ...current, [type]: forType };
    });
  }

  function onSave() {
    save.mutate(sanitizeBoosts(boosts, DEFAULT_CONFIG), {
      onSuccess: () => router.back(),
      onError: () => showAlert(t("whatMatters.saveFailed")),
    });
  }

  return (
    <>
      {types.map((type) => {
        const chosen = boosts[type] ?? {};
        const veryCount = Object.values(chosen).filter((l) => l === "very").length;
        const lessCount = Object.values(chosen).filter((l) => l === "less").length;
        return (
          <Card key={type}>
            <View className="gap-1">
              <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{t(`constants.connectionTypes.${type}`)}</Text>
              <Text className="text-sm text-ink-400 dark:text-ink-300">
                {t("whatMatters.limits", { very: MAX_VERY - veryCount, less: MAX_LESS - lessCount })}
              </Text>
            </View>
            {boostableCriteria(type, DEFAULT_CONFIG).map((criterion) => {
              const level = chosen[criterion] as Level | undefined;
              const canBeVery = !(isMentor(type) && criterion === "professional");
              return (
                <View key={criterion} className="gap-2">
                  <Text className="text-base text-ink-900 dark:text-ink-50">{t(`whatMatters.criteria.${criterion}`)}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {canBeVery ? (
                      <Chip
                        label={t("whatMatters.very")}
                        selected={level === "very"}
                        disabled={level !== "very" && veryCount >= MAX_VERY}
                        onPress={() => setLevel(type, criterion, level === "very" ? null : "very")}
                      />
                    ) : null}
                    <Chip label={t("whatMatters.normal")} selected={!level} onPress={() => setLevel(type, criterion, null)} />
                    <Chip
                      label={t("whatMatters.less")}
                      selected={level === "less"}
                      disabled={level !== "less" && lessCount >= MAX_LESS}
                      onPress={() => setLevel(type, criterion, level === "less" ? null : "less")}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        );
      })}
      <View className="mt-2">
        <Button label={save.isPending ? t("common.saving") : t("whatMatters.save")} disabled={save.isPending} onPress={onSave} />
      </View>
    </>
  );
}

export default function WhatMatters() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: preferences, isLoading } = useMatchingPreferences(userId);
  const { data: connectionTypes, isLoading: typesLoading } = useMyConnectionTypes(userId);

  return (
    <SubPage title={t("whatMatters.title")} subtitle={t("whatMatters.subtitle")} form>
      {isLoading || typesLoading ? null : (
        <WhatMattersForm
          types={(connectionTypes ?? []) as AppType[]}
          initial={sanitizeBoosts(preferences?.boosts, DEFAULT_CONFIG)}
          userId={userId}
        />
      )}
    </SubPage>
  );
}
