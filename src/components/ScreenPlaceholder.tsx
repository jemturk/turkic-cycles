import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";

export function ScreenPlaceholder({ title, phase }: { title: string; phase: string }) {
  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{title}</Text>
        <Text className="mt-2 text-center text-sm text-ink-400">{phase}</Text>
      </View>
    </SafeAreaView>
  );
}
