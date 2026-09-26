import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { supabase } from "@/api/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/Button";

export default function Settings() {
  const { session } = useSession();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <View className="flex-1 px-6 pt-10">
        <Text className="font-display text-2xl text-ink-900">Settings</Text>
        <Text className="mt-1 text-sm text-ink-400">{session?.user.email}</Text>

        <Text className="mt-6 text-sm text-ink-400">
          Account, safety, matching preferences, privacy, and verification settings land in
          Phase 5.
        </Text>

        <View className="mt-8">
          <Button label="Log out" variant="secondary" onPress={signOut} />
        </View>
      </View>
    </SafeAreaView>
  );
}
