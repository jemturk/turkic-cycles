import { Text, View } from "react-native";

import { Chip } from "@/components/Chip";

type Option<T extends string> = T | { value: T; label: string };

function normalize<T extends string>(option: Option<T>): { value: T; label: string } {
  return typeof option === "string" ? { value: option, label: option } : option;
}

type SingleSelectChipsProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (next: T) => void;
  error?: string;
};

export function SingleSelectChips<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: SingleSelectChipsProps<T>) {
  const normalized = options.map(normalize);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {normalized.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
      {error ? <Text className="text-xs text-coral-600">{error}</Text> : null}
    </View>
  );
}
