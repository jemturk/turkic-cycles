import { View } from "react-native";

type OnboardingProgressProps = {
  step: number;
  totalSteps: number;
};

export function OnboardingProgress({ step, totalSteps }: OnboardingProgressProps) {
  return (
    <View className="h-1.5 w-full flex-row gap-1">
      {Array.from({ length: totalSteps }, (_, i) => (
        <View key={i} className={`h-full flex-1 rounded-full ${i < step ? "bg-coral-500" : "bg-coral-100"}`} />
      ))}
    </View>
  );
}
