import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import { TextField } from "@/components/TextField";

type DateOfBirthFieldProps = {
  // Defaults to "Date of birth"; event forms reuse this field with their own label.
  label?: string;
  value?: string; // "YYYY-MM-DD"
  onChange: (iso: string) => void;
  error?: string;
};

function pad(n: string) {
  return n.padStart(2, "0");
}

// Plain numeric text fields rather than a native date picker: the Expo-recommended
// @react-native-community/datetimepicker has no web platform support at all, and
// this app targets web, so a cross-platform picker would need a second, separate
// implementation just for web. Three fields work identically everywhere.
export function DateOfBirthField({ label, value, onChange, error }: DateOfBirthFieldProps) {
  const { t } = useTranslation();
  const [day, setDay] = useState(value?.slice(8, 10) ?? "");
  const [month, setMonth] = useState(value?.slice(5, 7) ?? "");
  const [year, setYear] = useState(value?.slice(0, 4) ?? "");
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  function maybeEmit(d: string, m: string, y: string) {
    const dn = Number(d);
    const mn = Number(m);
    if (y.length === 4 && d.length >= 1 && m.length >= 1 && mn >= 1 && mn <= 12 && dn >= 1 && dn <= 31) {
      onChange(`${y}-${pad(m)}-${pad(d)}`);
    }
  }

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label ?? t("common.dateOfBirth")}</Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <TextField
            placeholder={t("common.dayPlaceholder")}
            keyboardType="number-pad"
            maxLength={2}
            value={day}
            returnKeyType="next"
            onSubmitEditing={() => monthRef.current?.focus()}
            onChangeText={(next) => {
              setDay(next);
              maybeEmit(next, month, year);
              // Both digits typed: move on to the month without a tap.
              if (next.length === 2) monthRef.current?.focus();
            }}
          />
        </View>
        <View className="flex-1">
          <TextField
            placeholder={t("common.monthPlaceholder")}
            keyboardType="number-pad"
            maxLength={2}
            value={month}
            ref={monthRef}
            returnKeyType="next"
            onSubmitEditing={() => yearRef.current?.focus()}
            onChangeText={(next) => {
              setMonth(next);
              maybeEmit(day, next, year);
              if (next.length === 2) yearRef.current?.focus();
            }}
          />
        </View>
        <View className="w-24">
          <TextField
            placeholder={t("common.yearPlaceholder")}
            keyboardType="number-pad"
            maxLength={4}
            value={year}
            ref={yearRef}
            onChangeText={(next) => {
              setYear(next);
              maybeEmit(day, month, next);
            }}
          />
        </View>
      </View>
      {error ? <Text className="text-xs text-accent-600">{error}</Text> : null}
    </View>
  );
}
