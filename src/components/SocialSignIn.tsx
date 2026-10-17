import { useEffect, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";
import * as AppleAuthentication from "expo-apple-authentication";

import { Text } from "@/components/Text";
import { signInWithApple, signInWithGoogle, type SocialSignInResult } from "@/api/socialAuth";
import { showAlert } from "@/lib/alert";

// "or", then Continue with Apple (iPhone only, Apple's own button as its guidelines
// require) and Continue with Google, under the email form on Log in and Sign up.
// A new account from either goes through onboarding like an email sign-up: the root
// gate (src/app/index.tsx) sends anyone without a finished profile there.
//
// captchaToken / captchaReady / onCaptchaUsed: the screen's CAPTCHA, which Supabase
// also checks on Apple's token exchange (single-use, so it's reset after each try).
// Google's hosted sign-in page isn't covered by it.
export function SocialSignIn({
  captchaToken,
  captchaReady,
  onCaptchaUsed,
}: {
  captchaToken?: string;
  captchaReady: boolean;
  onCaptchaUsed: () => void;
}) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  async function run(signIn: () => Promise<SocialSignInResult>, usesCaptcha: boolean) {
    setBusy(true);
    try {
      if ((await signIn()) === "signedIn" && Platform.OS !== "web") router.replace("/");
    } catch (error) {
      showAlert(t("auth.social.errorTitle"), (error as Error).message);
    } finally {
      setBusy(false);
      if (usesCaptcha) onCaptchaUsed();
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-[#F3E3D2] dark:bg-ink-700" />
        <Text className="text-sm text-ink-400">{t("auth.social.or")}</Text>
        <View className="h-px flex-1 bg-[#F3E3D2] dark:bg-ink-700" />
      </View>

      {appleAvailable ? (
        <View style={{ opacity: busy || !captchaReady ? 0.5 : 1 }} pointerEvents={busy || !captchaReady ? "none" : "auto"}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              colorScheme === "dark"
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={999}
            style={{ width: "100%", height: 54 }}
            onPress={() => run(() => signInWithApple(captchaToken), true)}
          />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => run(signInWithGoogle, false)}
        className={`h-[54px] w-full flex-row items-center justify-center gap-2.5 rounded-full border border-ink-100 bg-white web:hover:bg-primary-100/40 dark:border-ink-700 dark:bg-ink-800 ${
          busy ? "opacity-50" : ""
        }`}
      >
        <Ionicons name="logo-google" size={20} color="#4285F4" />
        <Text className="text-base font-semibold text-ink-900 dark:text-ink-50">{t("auth.social.google")}</Text>
      </Pressable>
    </View>
  );
}
