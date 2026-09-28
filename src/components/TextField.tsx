import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextField({ label, error, secureTextEntry, ...inputProps }: TextFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const canToggleVisibility = !!secureTextEntry;

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text> : null}
      <View className="justify-center">
        <TextInput
          className={`rounded-xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3 text-base text-ink-900 dark:text-ink-50 ${
            canToggleVisibility ? "pr-11" : ""
          }`}
          placeholderTextColor="#8A7C76"
          secureTextEntry={canToggleVisibility && !isVisible}
          {...inputProps}
        />
        {canToggleVisibility ? (
          <Pressable
            accessibilityLabel={isVisible ? "Hide password" : "Show password"}
            className="absolute right-3"
            onPress={() => setIsVisible((v) => !v)}
          >
            <Ionicons name={isVisible ? "eye-off-outline" : "eye-outline"} size={20} color="#8A7C76" />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-xs text-coral-600">{error}</Text> : null}
    </View>
  );
}
