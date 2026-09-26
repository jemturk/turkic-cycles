import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useCircle, useCircleMembers } from "@/hooks/useCircles";

export default function CircleMembers() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const { data: circle } = useCircle(circleId);
  const { data: members } = useCircleMembers(circleId);

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#2B2320" />
        </Pressable>

        <Text className="font-display text-2xl text-ink-900">{circle?.name ?? "Members"}</Text>
        <Text className="-mt-2 text-sm text-ink-400">{circle?.member_count ?? 0} members</Text>

        <View className="flex-row flex-wrap gap-4">
          {(members ?? []).map((member) => (
            <View key={member.userId} className="items-center gap-1" style={{ width: 72 }}>
              <View className="h-14 w-14 items-center justify-center rounded-full bg-coral-500">
                <Text className="text-lg font-semibold text-white">
                  {(member.displayName || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="text-xs text-ink-700" numberOfLines={1}>
                {member.displayName || "Member"}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
