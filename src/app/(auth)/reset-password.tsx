import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { passwordComplexitySchema } from "@/schemas/auth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { FormScrollView } from "@/components/FormScrollView";

export default function ResetPassword() {
  const { t } = useTranslation();
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
      //
      // The token_hash exchange is checked FIRST and always run when present --
      // never skipped just because *a* session already exists. Otherwise, opening a
      // recovery link for one account while still signed into a different account
      // would leave that other, unrelated session in place, and the password change
      // below would silently apply to the wrong account.
      if (params.token_hash && params.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: params.type as "recovery",
        });
        setVerifyError(error?.message ?? null);
        setIsVerifying(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsVerifying(false);
        return;
      }

      setVerifyError(t("auth.resetPassword.invalidLink"));
      setIsVerifying(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <FormScrollView className="flex-1" contentContainerClassName="flex-grow px-6 pb-10 pt-10">
        <Text className="font-display text-3xl text-ink-900 dark:text-ink-50">{t("auth.resetPassword.heading")}</Text>

        {isVerifying ? (
          <Text className="mt-4 text-base text-ink-700 dark:text-ink-200">{t("auth.resetPassword.verifying")}</Text>
        ) : verifyError ? (
          <>
            <Text className="mt-4 text-base text-ink-700 dark:text-ink-200">{verifyError}</Text>
            <View className="mt-6">
              <Button label={t("auth.resetPassword.backToLogin")} onPress={() => router.replace("/(auth)/login")} />
            </View>
          </>
        ) : (
          <>
            <Text className="mt-2 text-base text-ink-700 dark:text-ink-200">
              {t("auth.resetPassword.subheading")}
            </Text>
            <View className="mt-8 gap-2">
              <TextField
                label={t("auth.resetPassword.newPassword")}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Text className="text-xs text-ink-400">{t("auth.resetPassword.passwordHint")}</Text>
              {status ? <Text className="text-sm text-accent-600">{status}</Text> : null}
            </View>
            <View className="mt-8">
              <Button
                label={isSaving ? t("auth.resetPassword.saving") : t("auth.resetPassword.submit")}
                disabled={isSaving}
                onPress={onSubmit}
              />
            </View>
          </>
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}
