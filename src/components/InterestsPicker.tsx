import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Chip } from "@/components/Chip";
import { INTEREST_GROUPS, SELECTION_LIMITS } from "@/constants/matching";
import type { TagTone } from "@/constants/tagTones";

type Props = {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  /** Selected chips in this soft tint instead of solid teal (Edit profile). */
  tone?: TagTone;
};

// The matching model's interest tags (src/constants/matching.ts), under their group
// headings, 3 to 10 of them. One limit across all groups, so it's one component rather
// than a ChipGroup per group.
export function InterestsPicker({ label, value, onChange, error, tone }: Props) {
  const { t } = useTranslation();
  const { min, max } = SELECTION_LIMITS.interests;
  const atMax = value.length >= max;

  function toggle(tag: string) {
    if (value.includes(tag)) onChange(value.filter((v) => v !== tag));
    else if (!atMax) onChange([...value, tag]);
  }

  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
        <Text className={`text-xs ${value.length < min ? "text-ink-400" : "text-primary-600"}`}>
          {t("fields.interestsHint")} · {value.length}/{max}
        </Text>
      </View>
      {INTEREST_GROUPS.map((group) => (
        <View key={group.id} className="mt-1 gap-2">
          <Text className="text-xs uppercase tracking-wide text-ink-400 dark:text-ink-300">
            {t(`constants.interestGroups.${group.id}`)}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {group.tags.map((tag) => (
              <Chip
                key={tag}
                tone={tone}
                label={t(`constants.interests.${tag}`)}
                selected={value.includes(tag)}
                onPress={() => toggle(tag)}
                disabled={!value.includes(tag) && atMax}
              />
            ))}
          </View>
        </View>
      ))}
      {error ? <Text className="text-xs text-accent-600">{error}</Text> : null}
    </View>
  );
}
