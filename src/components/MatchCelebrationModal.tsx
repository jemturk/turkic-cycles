import { Text, View } from "react-native";

import { Button } from "@/components/Button";

type MatchCelebrationModalProps = {
  matchedName: string | null;
  onDismiss: () => void;
};

// A real overlay View rather than RN's Alert.alert: Alert is a no-op on web
// (react-native-web doesn't implement it), and this needs to be visible and
// testable on every platform this app targets, web included.
export function MatchCelebrationModal({ matchedName, onDismiss }: MatchCelebrationModalProps) {
  if (!matchedName) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/50 px-8">
      <View className="w-full items-center gap-4 rounded-2xl bg-white dark:bg-ink-800 p-6">
        <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">It&apos;s a match!</Text>
        <Text className="text-center text-base text-ink-700 dark:text-ink-200">
          You and {matchedName} both liked each other.
        </Text>
        <Button label="Keep exploring" onPress={onDismiss} />
      </View>
    </View>
  );
}
