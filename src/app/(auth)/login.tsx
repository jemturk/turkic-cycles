import { useState } from "react";
import { Alert, Text, View } from "react-native";
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

export default function Login() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthCredentials>({
    resolver: zodResolver(authCredentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: AuthCredentials) => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setIsSubmitting(false);

    if (error) {
      Alert.alert(t("auth.login.errorTitle"), error.message);
      return;
    }

    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-1 px-6 pt-6">
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
            className="self-end text-sm font-medium text-coral-500"
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            {t("auth.login.forgotPassword")}
          </Text>
        </View>

        <View className="mt-8">
          <Button label={t("auth.login.submit")} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
        </View>
      </View>
    </SafeAreaView>
  );
}
