import { View } from "react-native";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import { Chip } from "@/components/Chip";
import { TextField } from "@/components/TextField";

type Option<T extends string> = T | { value: T; label: string };

type ChipGroupProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  max?: number;
  otherOption?: { value: T; placeholder: string };
  error?: string;
  /** Translates bare-string options (constants.<namespace>.<value>); object-shaped
   * options keep their own given label as-is. */
  namespace?: string;
};

// Multi-select chip field. When `otherOption` is set, an extra "Other" chip
// reveals an inline text field; the typed text replaces the sentinel value in
// `value` before onChange fires, so callers never see the sentinel itself.
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  max,
  otherOption,
  error,
  namespace,
}: ChipGroupProps<T>) {
  const { t } = useTranslation();
  const normalize = (option: Option<T>): { value: T; label: string } =>
    typeof option === "string"
      ? { value: option, label: namespace ? t(`constants.${namespace}.${option}`, { defaultValue: option }) : option }
      : option;
  const normalized = options.map(normalize);
  const knownValues = new Set(normalized.map((o) => o.value));
  const customValue = otherOption
    ? value.find((v) => v !== otherOption.value && !knownValues.has(v))
    : undefined;
  const isOtherSelected = otherOption
    ? value.includes(otherOption.value) || customValue !== undefined
    : false;
  const atMax = max !== undefined && value.length >= max;

  function toggle(optionValue: T) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
      return;
    }
    if (atMax) return;
    onChange([...value, optionValue]);
  }

  function toggleOther() {
    if (!otherOption) return;
    if (isOtherSelected) {
      onChange(value.filter((v) => v !== otherOption.value && v !== customValue));
      return;
    }
    if (atMax) return;
    onChange([...value, otherOption.value]);
  }

  function setOtherText(text: string) {
    if (!otherOption) return;
    const withoutOther = value.filter((v) => v !== otherOption.value && v !== customValue);
    onChange(text.length > 0 ? [...withoutOther, text as T] : [...withoutOther, otherOption.value]);
  }

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {normalized.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={value.includes(option.value)}
            onPress={() => toggle(option.value)}
            disabled={!value.includes(option.value) && atMax}
          />
        ))}
        {otherOption ? (
          <Chip
            label={t("constants.other")}
            selected={isOtherSelected}
            onPress={toggleOther}
            disabled={!isOtherSelected && atMax}
          />
        ) : null}
      </View>
      {otherOption && isOtherSelected ? (
        <TextField placeholder={otherOption.placeholder} value={customValue ?? ""} onChangeText={setOtherText} />
      ) : null}
      {error ? <Text className="text-xs text-coral-600">{error}</Text> : null}
    </View>
  );
}
