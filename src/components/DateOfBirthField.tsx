import { useState } from "react";
import { Text, View } from "react-native";

import { TextField } from "@/components/TextField";

type DateOfBirthFieldProps = {
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
export function DateOfBirthField({ value, onChange, error }: DateOfBirthFieldProps) {
  const [day, setDay] = useState(value?.slice(8, 10) ?? "");
  const [month, setMonth] = useState(value?.slice(5, 7) ?? "");
  const [year, setYear] = useState(value?.slice(0, 4) ?? "");

  function maybeEmit(d: string, m: string, y: string) {
    const dn = Number(d);
    const mn = Number(m);
    if (y.length === 4 && d.length >= 1 && m.length >= 1 && mn >= 1 && mn <= 12 && dn >= 1 && dn <= 31) {
      onChange(`${y}-${pad(m)}-${pad(d)}`);
    }
  }

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-700">Date of birth</Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <TextField
            placeholder="DD"
            keyboardType="number-pad"
            maxLength={2}
            value={day}
            onChangeText={(next) => {
              setDay(next);
              maybeEmit(next, month, year);
            }}
          />
        </View>
        <View className="flex-1">
          <TextField
            placeholder="MM"
            keyboardType="number-pad"
            maxLength={2}
            value={month}
            onChangeText={(next) => {
              setMonth(next);
              maybeEmit(day, next, year);
            }}
          />
        </View>
        <View className="w-24">
          <TextField
            placeholder="YYYY"
            keyboardType="number-pad"
            maxLength={4}
            value={year}
            onChangeText={(next) => {
              setYear(next);
              maybeEmit(day, month, next);
            }}
          />
        </View>
      </View>
      {error ? <Text className="text-xs text-coral-600">{error}</Text> : null}
    </View>
  );
}
