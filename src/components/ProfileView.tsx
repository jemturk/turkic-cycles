import { Text, View } from "react-native";

import { calculateAge } from "@/lib/age";
import { CONNECTION_TYPE_LABELS } from "@/constants/connectionTypes";
import type { ConnectionType } from "@/constants/connectionTypes";
import type { Tables } from "@/types/database";

function ReadOnlyRow({ label, values }: { label: string; values: string[] | null | undefined }) {
  if (!values || values.length === 0) return null;
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink-700">{label}</Text>
      <Text className="text-base text-ink-900">{values.join(", ")}</Text>
    </View>
  );
}

type ProfileViewProps = {
  profile: Tables<"profiles"> | null | undefined;
  connectionTypes: ConnectionType[] | undefined;
  originCountries: string[] | undefined;
  fallbackName?: string;
};

export function ProfileView({ profile, connectionTypes, originCountries, fallbackName }: ProfileViewProps) {
  const age = profile?.birthdate ? calculateAge(profile.birthdate) : undefined;
  const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ");
  const nameLabel = profile?.display_name || fallbackName || "Add your name";

  return (
    <View className="gap-4">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-coral-500">
        <Text className="text-2xl font-semibold text-white">{nameLabel.charAt(0).toUpperCase()}</Text>
      </View>

      <Text className="font-display text-2xl text-ink-900">{nameLabel}</Text>
      <Text className="-mt-3 text-sm text-ink-400">
        {[age ? `${age}` : null, location || null].filter(Boolean).join(" · ")}
      </Text>
      {profile?.occupation ? <Text className="-mt-3 text-sm text-ink-700">{profile.occupation}</Text> : null}
      {profile?.bio ? <Text className="text-base text-ink-700">{profile.bio}</Text> : null}

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
      <ReadOnlyRow label="Origin countries" values={originCountries} />
    </View>
  );
}
