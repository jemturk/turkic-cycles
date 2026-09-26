import { Text, TextInput, View, type TextInputProps } from "react-native";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-700">{label}</Text>
      <TextInput
        className="rounded-xl border border-coral-100 bg-white px-4 py-3 text-base text-ink-900"
        placeholderTextColor="#8A7C76"
        {...inputProps}
      />
      {error ? <Text className="text-xs text-coral-600">{error}</Text> : null}
    </View>
  );
}
