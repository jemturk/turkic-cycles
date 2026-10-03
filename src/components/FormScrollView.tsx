import type { ComponentProps } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { cssInterop } from "nativewind";

// NativeWind only maps className -> style for React Native's own components; this
// registers the same mapping for KeyboardAwareScrollView so form screens keep
// their className / contentContainerClassName styling.
cssInterop(KeyboardAwareScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

type FormScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView> & {
  className?: string;
  contentContainerClassName?: string;
};

// Drop-in ScrollView for any screen with text fields: scrolls the focused field
// above the keyboard (a plain ScrollView leaves the lower fields and the submit
// button underneath it). Needs <KeyboardProvider> in the root layout.
//
// keyboardShouldPersistTaps="handled": tapping a button or chip while the
// keyboard is up acts on the first tap instead of only dismissing the keyboard.
export function FormScrollView({ bottomOffset = 32, ...props }: FormScrollViewProps) {
  return <KeyboardAwareScrollView bottomOffset={bottomOffset} keyboardShouldPersistTaps="handled" {...props} />;
}
