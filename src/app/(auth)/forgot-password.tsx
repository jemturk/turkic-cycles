import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: Linking.createURL("reset-password"),
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert(t("auth.forgotPassword.errorTitle"), error.message);
      return;
    }

    // Deliberately the same message whether or not the email is registered --
    // matches Supabase's own server-side behavior, avoids confirming which emails
    // have accounts.
    setSent(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <View className="flex-1 px-6 pt-6">
        <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" onPress={() => router.back()} />

        <Text className="mt-8 font-display text-3xl text-ink-900 dark:text-ink-50">
          {t("auth.forgotPassword.heading")}
        </Text>
        <Text className="mt-2 text-base text-ink-700 dark:text-ink-200">
          {t("auth.forgotPassword.subheading")}
        </Text>

        {sent ? (
          <View className="mt-8 gap-2 rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">
              {t("auth.forgotPassword.checkEmailTitle")}
            </Text>
            <Text className="text-sm text-ink-700 dark:text-ink-200">
              {t("auth.forgotPassword.checkEmailBody", { email: email.trim() })}
            </Text>
          </View>
        ) : (
          <>
            <View className="mt-8 gap-4">
              <TextField
                label={t("auth.forgotPassword.email")}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View className="mt-8">
              <Button
                label={isSubmitting ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.submit")}
                disabled={isSubmitting || !email.trim()}
                onPress={onSubmit}
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
