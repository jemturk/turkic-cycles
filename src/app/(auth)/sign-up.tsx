import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "@/api/client";
import { authCredentialsSchema, type AuthCredentials } from "@/schemas/auth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function SignUp() {
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
    const { error } = await supabase.auth.signUp(values);
    setIsSubmitting(false);

    if (error) {
      Alert.alert("Couldn't sign up", error.message);
      return;
    }

    // The root redirect gate (src/app/index.tsx) picks up the new session
    // and sends the user to onboarding automatically.
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <View className="flex-1 px-6 pt-6">
        <Ionicons name="chevron-back" size={24} color="#2B2320" onPress={() => router.back()} />

        <Text className="mt-8 font-display text-3xl text-ink-900">Create your account</Text>
        <Text className="mt-2 text-base text-ink-700">Join the Turkic Circles community.</Text>

        <View className="mt-8 gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label="Email"
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
                label="Password"
                secureTextEntry
                onChangeText={field.onChange}
                value={field.value}
                error={errors.password?.message}
              />
            )}
          />
        </View>

        <View className="mt-8">
          <Button label="Create account" onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
        </View>
      </View>
    </SafeAreaView>
  );
}
