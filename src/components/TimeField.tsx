import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";

// 24-hour time as two small numeric fields (hours, minutes) -- the same reasoning as
// DateOfBirthField: no native picker works on web too. Emits "HH:MM" once both
// parts are valid; focus moves to minutes after two hour digits.
export function TimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: string; // "HH:MM"
  onChange: (time: string) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const [hours, setHours] = useState(value?.slice(0, 2) ?? "");
  const [minutes, setMinutes] = useState(value?.slice(3, 5) ?? "");
  const minutesRef = useRef<TextInput>(null);

  function maybeEmit(h: string, m: string) {
    const hn = Number(h);
    const mn = Number(m);
    if (h.length >= 1 && m.length === 2 && hn <= 23 && mn <= 59) {
      onChange(`${h.padStart(2, "0")}:${m}`);
    } else {
      onChange("");
    }
  }

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
      <View className="flex-row items-center gap-2">
        <View className="w-20">
          <TextField
            placeholder={t("common.hourPlaceholder")}
            keyboardType="number-pad"
            maxLength={2}
            value={hours}
            returnKeyType="next"
            onSubmitEditing={() => minutesRef.current?.focus()}
            onChangeText={(next) => {
              setHours(next);
              maybeEmit(next, minutes);
              if (next.length === 2) minutesRef.current?.focus();
            }}
          />
        </View>
        <Text className="text-lg text-ink-700 dark:text-ink-200">:</Text>
        <View className="w-20">
          <TextField
            ref={minutesRef}
            placeholder={t("common.minutePlaceholder")}
            keyboardType="number-pad"
            maxLength={2}
            value={minutes}
            onChangeText={(next) => {
              setMinutes(next);
              maybeEmit(hours, next);
            }}
          />
        </View>
      </View>
      {error ? <Text className="text-xs text-accent-600">{error}</Text> : null}
    </View>
  );
}
