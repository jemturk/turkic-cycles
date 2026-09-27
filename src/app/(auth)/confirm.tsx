import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { supabase } from "@/api/client";
import { Button } from "@/components/Button";

export default function ConfirmEmail() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [status, setStatus] = useState<"verifying" | "done" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Same dual-path handling as reset-password.tsx: web's detectSessionInUrl may
      // already have established a session from the link, or it may carry a
      // token_hash+type pair that needs to be exchanged explicitly.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus("done");
        return;
      }

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

      setErrorMessage("This confirmation link is invalid or has expired.");
      setStatus("error");
    })();
  }, [params.token_hash, params.type]);

  useEffect(() => {
    if (status !== "done") return;
    // Brief pause so the "confirmed" message is readable before the root
    // redirect gate (src/app/index.tsx) sends the user into onboarding.
    const timeout = setTimeout(() => router.replace("/"), 800);
    return () => clearTimeout(timeout);
  }, [status]);

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <View className="flex-1 items-center justify-center px-6">
        {status === "verifying" ? (
          <Text className="text-base text-ink-700">Confirming your email...</Text>
        ) : status === "done" ? (
          <Text className="text-base text-ink-700">Email confirmed! Taking you in...</Text>
        ) : (
          <>
            <Text className="text-center text-base text-ink-700">{errorMessage}</Text>
            <View className="mt-6">
              <Button label="Back to log in" onPress={() => router.replace("/(auth)/login")} />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
