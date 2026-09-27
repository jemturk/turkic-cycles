import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import { supabase } from "@/api/client";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function ForgotPassword() {
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
      Alert.alert("Couldn't send reset link", error.message);
      return;
    }

    // Deliberately the same message whether or not the email is registered --
    // matches Supabase's own server-side behavior, avoids confirming which emails
    // have accounts.
    setSent(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <View className="flex-1 px-6 pt-6">
        <Ionicons name="chevron-back" size={24} color="#2B2320" onPress={() => router.back()} />

        <Text className="mt-8 font-display text-3xl text-ink-900">Reset your password</Text>
        <Text className="mt-2 text-base text-ink-700">
          Enter your email and we&apos;ll send you a link to set a new password.
        </Text>

        {sent ? (
          <View className="mt-8 gap-2 rounded-2xl border border-teal-500 bg-white p-4">
            <Text className="font-display text-lg text-ink-900">Check your email</Text>
            <Text className="text-sm text-ink-700">
              If an account exists for {email.trim()}, a reset link is on its way.
            </Text>
          </View>
        ) : (
          <>
            <View className="mt-8 gap-4">
              <TextField
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View className="mt-8">
              <Button
                label={isSubmitting ? "Sending..." : "Send reset link"}
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
