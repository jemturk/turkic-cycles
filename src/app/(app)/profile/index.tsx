import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";

export default function OwnProfile() {
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <View className="flex-1 px-6 pt-10">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-coral-500">
          <Text className="text-2xl font-semibold text-white">
            {(profile?.display_name || session?.user.email || "?").charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text className="mt-4 font-display text-2xl text-ink-900">
          {profile?.display_name || "Add your name"}
        </Text>
        <Text className="mt-1 text-sm text-ink-400">{session?.user.email}</Text>

        <Text className="mt-8 text-sm text-ink-400">
          Full profile view/edit (bio, languages, interests, &ldquo;looking for&rdquo; tags,
          verification badge) lands in Phase 1.
        </Text>
      </View>
    </SafeAreaView>
  );
}
