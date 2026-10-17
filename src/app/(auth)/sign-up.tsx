import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { signUpCredentialsSchema, type SignUpCredentials } from "@/schemas/auth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { FormScrollView } from "@/components/FormScrollView";
import { useCaptcha } from "@/hooks/useCaptcha";
import { SocialSignIn } from "@/components/SocialSignIn";
import { showAlert } from "@/lib/alert";

export default function SignUp() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const captcha = useCaptcha();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpCredentials>({
    resolver: zodResolver(signUpCredentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignUpCredentials) => {
    setIsSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      ...values,
      options: { emailRedirectTo: Linking.createURL("confirm"), captchaToken: captcha.captchaToken },
    });
    setIsSubmitting(false);
    captcha.reset();

    if (error) {
      showAlert(t("auth.signUp.errorTitle"), error.message);
      return;
    }

    if (!data.session) {
      // No session means email confirmation is required before sign-in --
      // show the "check your email" state instead of entering the app.
      setSentEmail(values.email);
      return;
    }

    // The root redirect gate (src/app/index.tsx) picks up the new session
    // and sends the user to onboarding automatically.
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <FormScrollView className="flex-1" contentContainerClassName="flex-grow px-6 pb-10 pt-6">
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />

        <Text className="mt-8 font-display text-3xl text-ink-900 dark:text-ink-50">{t("auth.signUp.heading")}</Text>
        <Text className="mt-2 text-base text-ink-700 dark:text-ink-200">{t("auth.signUp.subheading")}</Text>

        {sentEmail ? (
          <View className="mt-8 gap-2 rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
              {t("auth.signUp.checkEmailTitle")}
            </Text>
            <Text className="text-sm text-ink-700 dark:text-ink-200">
              {t("auth.signUp.checkEmailBody", { email: sentEmail })}
            </Text>
          </View>
        ) : (
          <>
            <View className="mt-8 gap-4">
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <TextField
                    label={t("auth.signUp.email")}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={field.onChange}
                    value={field.value}
                    error={errors.email?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <TextField
                    label={t("auth.signUp.password")}
                    secureTextEntry
                    onChangeText={field.onChange}
                    value={field.value}
                    error={errors.password?.message}
                  />
                )}
              />
              {!errors.password ? (
                <Text className="-mt-2 text-xs text-ink-400">{t("auth.signUp.passwordHint")}</Text>
              ) : null}
            </View>

            <View className="mt-8 gap-4">
              {captcha.widget}
              <Button
                label={t("auth.signUp.submit")}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || !captcha.ready}
              />
              {/* Agreeing to the Terms and Privacy Policy, as both stores expect at sign-up. */}
              <Text className="text-center text-xs leading-5 text-ink-400">
                {t("auth.signUp.agreePrefix")}{" "}
                <Text className="font-semibold text-primary-500" onPress={() => router.push("/(auth)/terms")}>
                  {t("auth.signUp.terms")}
                </Text>{" "}
                {t("auth.signUp.agreeAnd")}{" "}
                <Text className="font-semibold text-primary-500" onPress={() => router.push("/(auth)/privacy")}>
                  {t("auth.signUp.privacy")}
                </Text>
                .
              </Text>
              <SocialSignIn
                captchaToken={captcha.captchaToken}
                captchaReady={captcha.ready}
                onCaptchaUsed={captcha.reset}
              />
            </View>
          </>
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}
