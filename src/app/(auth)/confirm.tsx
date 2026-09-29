import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { Button } from "@/components/Button";

export default function ConfirmEmail() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [status, setStatus] = useState<"verifying" | "done" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Same dual-path handling as reset-password.tsx: web's detectSessionInUrl may
      // already have established a session from the link, or it may carry a
      // token_hash+type pair that needs to be exchanged explicitly.
      //
      // The token_hash exchange is checked FIRST and always run when present --
      // never skipped just because *a* session already exists. If the browser still
      // holds a different, unrelated session (e.g. still signed in as another
      // account when this link is opened), checking "is there a session" first would
      // treat that leftover session as proof this link's confirmation succeeded,
      // silently leaving the wrong account signed in instead of the one the link was
      // actually sent to.
      if (params.token_hash && params.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: params.type as "signup" | "email",
        });
        if (error) {
          setErrorMessage(error.message);
          setStatus("error");
          return;
        }
        setStatus("done");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus("done");
        return;
      }

      setErrorMessage(t("auth.confirm.invalidLink"));
      setStatus("error");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token_hash, params.type]);

  useEffect(() => {
    if (status !== "done") return;
    // Brief pause so the "confirmed" message is readable before the root
    // redirect gate (src/app/index.tsx) sends the user into onboarding.
    const timeout = setTimeout(() => router.replace("/"), 800);
    return () => clearTimeout(timeout);
  }, [status]);

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-1 items-center justify-center px-6">
        {status === "verifying" ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("auth.confirm.verifying")}</Text>
        ) : status === "done" ? (
          <Text className="text-base text-ink-700 dark:text-ink-200">{t("auth.confirm.done")}</Text>
        ) : (
          <>
            <Text className="text-center text-base text-ink-700 dark:text-ink-200">{errorMessage}</Text>
            <View className="mt-6">
              <Button label={t("auth.confirm.backToLogin")} onPress={() => router.replace("/(auth)/login")} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
