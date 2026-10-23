import { useState, type Ref } from "react";
import { Platform, Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { usePlaceholderColor } from "@/hooks/usePlaceholderColor";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  // Reaches the inner TextInput, e.g. to move focus to it (React 19 passes ref as
  // an ordinary prop to function components).
  ref?: Ref<TextInput>;
};

// text-base carries a line height, and iOS clips a single-line TextInput's descenders
// (the tail of g, y, p) to it. 0 there means "no fixed line height".
const IOS_INPUT_STYLE = Platform.OS === "ios" ? { lineHeight: 0 } : undefined;

export function TextField({ label, error, secureTextEntry, ref, style, ...inputProps }: TextFieldProps) {
  const placeholderColor = usePlaceholderColor();
  const [isVisible, setIsVisible] = useState(false);
  const canToggleVisibility = !!secureTextEntry;

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text> : null}
      <View className="justify-center">
        <TextInput
          ref={ref}
          className={`rounded-xl border border-primary-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-4 py-3 text-base text-ink-900 dark:text-ink-50 ${
            canToggleVisibility ? "pr-11" : ""
          }`}
          placeholderTextColor={placeholderColor}
          secureTextEntry={canToggleVisibility && !isVisible}
          {...inputProps}
          style={[IOS_INPUT_STYLE, style]}
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
      {error ? <Text className="text-xs text-accent-600">{error}</Text> : null}
    </View>
  );
}
