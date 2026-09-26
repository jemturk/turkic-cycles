import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyConnectionTypes, useMyProfileSensitive } from "@/hooks/useOnboarding";
import { calculateAge } from "@/lib/age";
import { CONNECTION_TYPE_LABELS } from "@/constants/connectionTypes";
import { Button } from "@/components/Button";

function ReadOnlyRow({ label, values }: { label: string; values: string[] | null | undefined }) {
  if (!values || values.length === 0) return null;
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink-700">{label}</Text>
      <Text className="text-base text-ink-900">{values.join(", ")}</Text>
    </View>
  );
}

export default function OwnProfile() {
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);
  const { data: connectionTypes } = useMyConnectionTypes(session?.user.id);
  const { data: sensitive } = useMyProfileSensitive(session?.user.id);

  const age = profile?.birthdate ? calculateAge(profile.birthdate) : undefined;
  const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ");

  return (
    <SafeAreaView className="flex-1 bg-coral-50">
      <ScrollView className="flex-1 px-6 pt-10" contentContainerClassName="gap-4 pb-10">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-coral-500">
          <Text className="text-2xl font-semibold text-white">
            {(profile?.display_name || session?.user.email || "?").charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text className="font-display text-2xl text-ink-900">{profile?.display_name || "Add your name"}</Text>
        <Text className="-mt-3 text-sm text-ink-400">
          {[age ? `${age}` : null, location || null].filter(Boolean).join(" · ")}
        </Text>
        {profile?.occupation ? <Text className="-mt-3 text-sm text-ink-700">{profile.occupation}</Text> : null}

        {connectionTypes && connectionTypes.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {connectionTypes.map((type) => (
              <View key={type} className="rounded-full bg-coral-100 px-3 py-1">
                <Text className="text-xs font-medium text-coral-600">{CONNECTION_TYPE_LABELS[type]}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <ReadOnlyRow label="Languages" values={profile?.languages} />
        <ReadOnlyRow label="Interests" values={profile?.interests} />
        <ReadOnlyRow label="Hobbies" values={profile?.hobbies} />
        <ReadOnlyRow label="Travel style" values={profile?.travel_style} />
        <ReadOnlyRow label="Origin countries" values={sensitive?.origin_countries} />

        <View className="mt-4">
          <Button label="Edit profile" onPress={() => router.push("/(app)/profile/edit")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
