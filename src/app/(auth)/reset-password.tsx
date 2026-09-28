import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { supabase } from "@/api/client";
import { passwordComplexitySchema } from "@/schemas/auth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // The recovery link may already have established a session (web's
      // detectSessionInUrl picking up an implicit #access_token fragment), or it may
      // carry a token_hash+type pair (Supabase's current default email template)
      // that needs to be exchanged for a session explicitly -- handle both, since
      // which one arrives depends on the project's email template configuration.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsVerifying(false);
        return;
      }

      if (params.token_hash && params.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: params.type as "recovery",
        });
        setVerifyError(error?.message ?? null);
        setIsVerifying(false);
        return;
      }

      setVerifyError("This reset link is invalid or has expired.");
      setIsVerifying(false);
    })();
  }, [params.token_hash, params.type]);

  async function onSubmit() {
    const result = passwordComplexitySchema.safeParse(password);
    if (!result.success) {
      setStatus(result.error.issues[0].message);
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    router.replace("/");
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-1 px-6 pt-10">
        <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">Set a new password</Text>

        {isVerifying ? (
          <Text className="mt-4 text-base text-ink-700 dark:text-ink-200">Verifying your link...</Text>
        ) : verifyError ? (
          <>
            <Text className="mt-4 text-base text-ink-700 dark:text-ink-200">{verifyError}</Text>
            <View className="mt-6">
              <Button label="Back to log in" onPress={() => router.replace("/(auth)/login")} />
            </View>
          </>
        ) : (
          <>
            <Text className="mt-2 text-base text-ink-700 dark:text-ink-200">Choose a new password for your account.</Text>
            <View className="mt-8 gap-2">
              <TextField label="New password" secureTextEntry value={password} onChangeText={setPassword} />
              <Text className="text-xs text-ink-400">
                8+ characters, with uppercase, lowercase, a number, and a special character.
              </Text>
              {status ? <Text className="text-sm text-coral-600">{status}</Text> : null}
            </View>
            <View className="mt-8">
              <Button label={isSaving ? "Saving..." : "Set new password"} disabled={isSaving} onPress={onSubmit} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
