import { useState } from "react";
import { Alert, View } from "react-native";
import { Text } from "@/components/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { authCredentialsSchema, type AuthCredentials } from "@/schemas/auth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { FormScrollView } from "@/components/FormScrollView";
import { useCaptcha } from "@/hooks/useCaptcha";
import { SocialSignIn } from "@/components/SocialSignIn";

export default function Login() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const captcha = useCaptcha();
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<AuthCredentials>({
    resolver: zodResolver(authCredentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: AuthCredentials) => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      ...values,
      options: { captchaToken: captcha.captchaToken },
    });
    setIsSubmitting(false);
    captcha.reset();

    if (error) {
      Alert.alert(t("auth.login.errorTitle"), error.message);
      return;
    }

    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50 dark:bg-ink-950">
      <FormScrollView className="flex-1" contentContainerClassName="flex-grow px-6 pb-10 pt-6">
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />

        <Text className="mt-8 font-display text-3xl text-ink-900 dark:text-ink-50">{t("auth.login.heading")}</Text>
        <Text className="mt-2 text-base text-ink-700 dark:text-ink-200">{t("auth.login.subheading")}</Text>

        <View className="mt-8 gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label={t("auth.login.email")}
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
                label={t("auth.login.password")}
                secureTextEntry
                onChangeText={field.onChange}
                value={field.value}
                error={errors.password?.message}
              />
            )}
          />
          <Text
            className="self-end text-sm font-medium text-primary-500"
            // Carries over the email typed here, so it's already filled in there.
            onPress={() => {
              const email = getValues("email").trim();
              router.push({ pathname: "/(auth)/forgot-password", params: email ? { email } : {} });
            }}
          >
            {t("auth.login.forgotPassword")}
          </Text>
        </View>

        <View className="mt-8 gap-3">
          {captcha.widget}
          <Button
            label={t("auth.login.submit")}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || !captcha.ready}
          />
          <SocialSignIn
            captchaToken={captcha.captchaToken}
            captchaReady={captcha.ready}
            onCaptchaUsed={captcha.reset}
          />
          <Text className="text-center text-sm text-ink-400">
            {t("auth.login.noAccount")}{" "}
            <Text className="font-semibold text-primary-500" onPress={() => router.push("/(auth)/sign-up")}>
              {t("auth.login.signUp")}
            </Text>
          </Text>
        </View>
      </FormScrollView>
    </SafeAreaView>
  );
}
