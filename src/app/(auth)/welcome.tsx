import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/Button";

const FEATURES = [
  { icon: "people-outline" as const, label: "Meet people who share your roots" },
  { icon: "sparkles-outline" as const, label: "Join circles built around what matters to you" },
  { icon: "heart-outline" as const, label: "Real relationships — friendship, partnership, business" },
];

export default function Welcome() {
  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <View className="flex-1 justify-between px-6 pb-6 pt-10">
        <View>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-coral-500">
            <Ionicons name="infinite-outline" size={22} color="white" />
          </View>

          <Text className="mt-10 font-display text-4xl text-ink-900">
            Turkic <Text className="text-coral-500">Circles</Text>
          </Text>

          <Text className="mt-4 text-base leading-6 text-ink-700">
            Meaningful connections within the Turkic community — join circles, meet people,
            belong somewhere.
          </Text>

          <View className="mt-8 gap-4">
            {FEATURES.map((feature) => (
              <View key={feature.label} className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-coral-100">
                  <Ionicons name={feature.icon} size={20} color="#C24F2A" />
                </View>
                <Text className="flex-1 text-sm text-ink-900">{feature.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Button label="Get started" onPress={() => router.push("/(auth)/sign-up")} />
          <Text className="text-center text-sm text-ink-400">
            Already have an account?{" "}
            <Text className="font-semibold text-coral-500" onPress={() => router.push("/(auth)/login")}>
              Log in
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
