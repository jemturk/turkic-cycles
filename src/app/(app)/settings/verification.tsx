import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSession } from "@/hooks/useSession";
import { useMyVerificationStatus, useSubmitVerificationStub } from "@/hooks/useVerification";
import { Button } from "@/components/Button";

export default function Verification() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: verification } = useMyVerificationStatus(userId);
  const submit = useSubmitVerificationStub(userId);

  const status = verification?.status ?? "unverified";

  return (
    <SafeAreaView className="flex-1 bg-coral-50 dark:bg-ink-950">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} className="text-ink-900 dark:text-ink-50" />
        </Pressable>

        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <Ionicons name="shield-checkmark-outline" size={32} color="#2C8B80" />
          </View>
          <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">Get the Verified badge</Text>
          <Text className="text-center text-sm text-ink-700 dark:text-ink-200">
            Verified members are trusted faster in every circle — and it helps keep every
            conversation on Turkic Circles real.
          </Text>
        </View>

        {status === "pending" ? (
          <View className="rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">Pending review</Text>
            <Text className="mt-1 text-sm text-ink-700 dark:text-ink-200">
              We&apos;ll review your submission and update your badge soon.
            </Text>
          </View>
        ) : status === "verified" ? (
          <View className="rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
            <Text className="font-display text-lg text-ink-900 dark:text-ink-50">You&apos;re verified ✓</Text>
          </View>
        ) : (
          <>
            <View className="flex-row items-center gap-3 rounded-2xl border border-teal-500 bg-white dark:bg-ink-800 p-4">
              <Ionicons name="person-outline" size={22} color="#2C8B80" />
              <View className="flex-1">
                <Text className="font-display text-base text-ink-900 dark:text-ink-50">Take a quick selfie</Text>
                <Text className="text-xs text-ink-400">We match it to your profile photos</Text>
              </View>
              <Ionicons name="checkmark" size={20} color="#2C8B80" />
            </View>

            <View className="flex-row items-center gap-3 rounded-2xl border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 p-4">
              <Ionicons name="card-outline" size={22} color="#D9663D" />
              <View className="flex-1">
                <Text className="font-display text-base text-ink-900 dark:text-ink-50">Upload a government ID</Text>
                <Text className="text-xs text-ink-400">Passport, driver&apos;s license, or national ID</Text>
              </View>
              <Text className="text-xs font-medium text-coral-600">Required</Text>
            </View>

            <View className="flex-row gap-2 rounded-xl bg-teal-50 p-3">
              <Ionicons name="lock-closed-outline" size={18} color="#2C8B80" />
              <Text className="flex-1 text-xs text-ink-700 dark:text-ink-200">
                Your ID is only used to confirm your selfie matches. Manual review for now — real
                ID verification (Stripe Identity) is coming soon.
              </Text>
            </View>

            <View className="mt-2">
              <Button
                label={submit.isPending ? "Submitting..." : "Upload ID to finish"}
                disabled={submit.isPending}
                onPress={() => submit.mutate()}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
