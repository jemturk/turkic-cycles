import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { normalizeForSearch } from "@/constants/countries";

export type PickerOption = { value: string; label: string };

type Row = { kind: "header"; key: string; label: string } | { kind: "option"; key: string; option: PickerOption };

type SearchablePickerProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  // Values listed first, under their own heading, while the search box is empty.
  suggested?: readonly string[];
  suggestedLabel?: string;
  allLabel?: string;
};

// A form field that opens a full-screen, searchable list -- for long fixed lists
// (countries, US states) where a chip group or free text doesn't work. Search
// ignores case and accents, and ranks names that start with the query first.
export function SearchablePicker({
  label,
  placeholder,
  searchPlaceholder,
  options,
  value,
  onChange,
  error,
  suggested,
  suggestedLabel,
  allLabel,
}: SearchablePickerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  // A stored value that isn't in the list (free text from before the picker
  // existed) still shows, rather than looking empty.
  const displayLabel = selected?.label ?? value;

  const rows = useMemo<Row[]>(() => {
    const needle = normalizeForSearch(query);
    if (needle) {
      const matches = options
        .map((option) => ({ option, name: normalizeForSearch(option.label), code: normalizeForSearch(option.value) }))
        .filter(({ name, code }) => name.includes(needle) || code === needle)
        .sort((a, b) => Number(b.name.startsWith(needle)) - Number(a.name.startsWith(needle)));
      return matches.map(({ option }) => ({ kind: "option", key: option.value, option }));
    }
    const all: Row[] = options.map((option) => ({ kind: "option", key: option.value, option }));
    const suggestedOptions = (suggested ?? [])
      .map((v) => options.find((o) => o.value === v))
      .filter((o): o is PickerOption => !!o);
    if (suggestedOptions.length === 0) return all;
    return [
      { kind: "header", key: "header-suggested", label: suggestedLabel ?? "" },
      ...suggestedOptions.map((option) => ({ kind: "option" as const, key: `suggested-${option.value}`, option })),
      { kind: "header", key: "header-all", label: allLabel ?? "" },
      ...all,
    ];
  }, [options, query, suggested, suggestedLabel, allLabel]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={displayLabel ? `${label}: ${displayLabel}` : label}
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3"
      >
        <Text
          className={`flex-1 text-base ${displayLabel ? "text-ink-900 dark:text-ink-50" : "text-ink-400"}`}
          numberOfLines={1}
        >
          {displayLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#8A7C76" />
      </Pressable>
      {error ? <Text className="text-xs text-accent-600">{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View
          className="mx-auto w-full max-w-[480px] flex-1 bg-primary-50 dark:bg-ink-950"
          style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-center gap-3 px-4 pb-3">
            <Pressable accessibilityLabel={t("common.close")} hitSlop={8} onPress={close}>
              <Ionicons name="close" size={26} color="#8A7C76" />
            </Pressable>
            <Text className="flex-1 font-display text-xl text-ink-900 dark:text-ink-50">{label}</Text>
          </View>

          <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3">
            <Ionicons name="search" size={18} color="#8A7C76" />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor="#8A7C76"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              className="flex-1 text-base text-ink-900 dark:text-ink-50"
              style={{ outlineStyle: "none" } as never}
            />
            {query ? (
              <Pressable accessibilityLabel={t("common.clear")} hitSlop={8} onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color="#8A7C76" />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerClassName="px-4 pb-6"
            ListEmptyComponent={
              <Text className="py-6 text-center text-sm text-ink-400">{t("location.noResults", { query: query.trim() })}</Text>
            }
            renderItem={({ item }) =>
              item.kind === "header" ? (
                <Text className="px-1 pb-1 pt-4 text-xs font-medium uppercase text-ink-400">{item.label}</Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(item.option.value);
                    close();
                  }}
                  className="flex-row items-center justify-between rounded-xl px-3 py-3"
                >
                  <Text className="flex-1 text-base text-ink-900 dark:text-ink-50">{item.option.label}</Text>
                  {item.option.value === value ? <Ionicons name="checkmark" size={20} color="#127A87" /> : null}
                </Pressable>
              )
            }
          />
        </View>
      </Modal>
    </View>
  );
}
