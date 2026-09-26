import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/api/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function Account() {
  const { session } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onChangePassword() {
    if (newPassword.length < 8) {
      setStatus("Password must be at least 8 characters.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSaving(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setNewPassword("");
    setStatus("Password updated.");
    // Alert.alert is a no-op on web; this confirmation also shows inline above.
    if (Platform.OS !== "web") Alert.alert("Password updated");
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#2B2320" />
        </Pressable>

        <Text className="font-display text-2xl text-ink-900">Account</Text>

        <View className="gap-1">
          <Text className="text-sm font-medium text-ink-700">Email</Text>
          <Text className="text-base text-ink-900">{session?.user.email}</Text>
        </View>

        <View className="gap-1">
          <Text className="text-sm font-medium text-ink-700">Phone</Text>
          <Text className="text-base text-ink-400">Not available yet</Text>
        </View>

        <View className="gap-1">
          <Text className="text-sm font-medium text-ink-700">Linked accounts</Text>
          <Text className="text-base text-ink-400">Not available yet</Text>
        </View>

        <View className="mt-4 gap-2">
          <TextField
            label="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          {status ? <Text className="text-sm text-ink-700">{status}</Text> : null}
          <Button label={isSaving ? "Saving..." : "Change password"} disabled={isSaving} onPress={onChangePassword} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
