import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { Button } from "@/components/Button";
import { AppHandoff, isFromApp } from "@/components/AppHandoff";

export default function ConfirmEmail() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token_hash?: string; type?: string; redirect_to?: string }>();
  const [inBrowser, setInBrowser] = useState(false);
  const handOff = !!params.token_hash && !!params.type && isFromApp(params.redirect_to) && !inBrowser;
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
      //
      // Not while offering to open the app instead (AppHandoff): that would use up the
      // code before the app gets it.
      if (handOff) return;
      if (params.token_hash && params.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: params.type as "signup" | "email" | "magiclink" | "email_change",
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
  }, [params.token_hash, params.type, handOff]);

  useEffect(() => {
    if (status !== "done") return;
    // Brief pause so the "confirmed" message is readable before the root
    // redirect gate (src/app/index.tsx) sends the user into onboarding.
    const timeout = setTimeout(() => router.replace("/"), 800);
    return () => clearTimeout(timeout);
  }, [status]);

  if (handOff) {
    return (
      <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
        <AppHandoff
          path="confirm"
          tokenHash={params.token_hash!}
          type={params.type!}
          onContinueInBrowser={() => setInBrowser(true)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
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
