import { Text, View } from "react-native";

import { calculateAge } from "@/lib/age";
import { CONNECTION_TYPE_LABELS } from "@/constants/connectionTypes";
import type { ConnectionType } from "@/constants/connectionTypes";
import type { Tables } from "@/types/database";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar } from "@/components/Avatar";
import { EditableAvatar } from "@/components/EditableAvatar";

function TagRow({ label, values }: { label: string; values: string[] | null | undefined }) {
  if (!values || values.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {values.map((value) => (
          <View key={value} className="rounded-full border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-3 py-1.5">
            <Text className="text-xs font-medium text-ink-700 dark:text-ink-200">{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="gap-4 rounded-2xl bg-white dark:bg-ink-800 p-4">{children}</View>;
}

type ProfileViewProps = {
  profile: Tables<"profiles"> | null | undefined;
  connectionTypes: ConnectionType[] | undefined;
  originCountries: string[] | undefined;
  fallbackName?: string;
  verificationStatus?: string | null;
  /** Only set on the signed-in user's own profile -- enables the tap-to-change avatar. */
  ownUserId?: string;
};

export function ProfileView({
  profile,
  connectionTypes,
  originCountries,
  fallbackName,
  verificationStatus,
  ownUserId,
}: ProfileViewProps) {
  const age = profile?.birthdate ? calculateAge(profile.birthdate) : undefined;
  const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ");
  const nameLabel = profile?.display_name || fallbackName || "Add your name";

  return (
    <View className="gap-4">
      <Card>
        <View className="items-center gap-3">
          {ownUserId ? (
            <EditableAvatar userId={ownUserId} uri={profile?.avatar_url} name={nameLabel} size={88} />
          ) : (
            <Avatar uri={profile?.avatar_url} name={nameLabel} size={88} />
          )}

          <View className="items-center gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{nameLabel}</Text>
              <VerifiedBadge status={verificationStatus} />
            </View>
            <Text className="text-sm text-ink-400">
              {[age ? `${age}` : null, location || null].filter(Boolean).join(" · ")}
            </Text>
            {profile?.occupation ? <Text className="text-sm text-ink-700 dark:text-ink-200">{profile.occupation}</Text> : null}
          </View>
        </View>

        {profile?.bio ? <Text className="text-center text-base text-ink-700 dark:text-ink-200">{profile.bio}</Text> : null}

        {connectionTypes && connectionTypes.length > 0 ? (
          <View className="flex-row flex-wrap justify-center gap-2">
            {connectionTypes.map((type) => (
              <View key={type} className="rounded-full bg-coral-100 px-3 py-1.5">
                <Text className="text-xs font-medium text-coral-600">{CONNECTION_TYPE_LABELS[type]}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {profile?.languages?.length || profile?.interests?.length || profile?.hobbies?.length ? (
        <Card>
          <TagRow label="Languages" values={profile?.languages} />
          <TagRow label="Interests" values={profile?.interests} />
          <TagRow label="Hobbies" values={profile?.hobbies} />
        </Card>
      ) : null}

      {profile?.travel_style?.length || originCountries?.length ? (
        <Card>
          <TagRow label="Travel style" values={profile?.travel_style} />
          <TagRow label="Origin countries" values={originCountries} />
        </Card>
      ) : null}
    </View>
  );
}
