import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { calculateAge } from "@/lib/age";
import type { ConnectionType } from "@/constants/connectionTypes";
import type { Tables } from "@/types/database";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar } from "@/components/Avatar";
import { EditableAvatar } from "@/components/EditableAvatar";

// `namespace` looks up each value's display label under constants.<namespace>.<value>;
// values without a translation (freeform "Other" text a user typed in) just fall back
// to showing themselves as-is via i18next's defaultValue.
function TagRow({
  label,
  values,
  namespace,
}: {
  label: string;
  values: string[] | null | undefined;
  namespace: string;
}) {
  const { t } = useTranslation();
  if (!values || values.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {values.map((value) => (
          <View key={value} className="rounded-full border border-coral-100 dark:border-ink-700 bg-white dark:bg-ink-800 px-3 py-1.5">
            <Text className="text-xs font-medium text-ink-700 dark:text-ink-200">
              {t(`constants.${namespace}.${value}`, { defaultValue: value })}
            </Text>
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
  const { t } = useTranslation();
  const age = profile?.birthdate ? calculateAge(profile.birthdate) : undefined;
  const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ");
  const nameLabel = profile?.display_name || fallbackName || t("profile.addYourName");

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
                <Text className="text-xs font-medium text-coral-600">
                  {t(`constants.connectionTypes.${type}`)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {profile?.languages?.length || profile?.interests?.length || profile?.hobbies?.length ? (
        <Card>
          <TagRow label={t("profile.languages")} values={profile?.languages} namespace="languages" />
          <TagRow label={t("profile.interests")} values={profile?.interests} namespace="interests" />
          <TagRow label={t("profile.hobbies")} values={profile?.hobbies} namespace="hobbies" />
        </Card>
      ) : null}

      {profile?.travel_style?.length || originCountries?.length ? (
        <Card>
          <TagRow label={t("profile.travelStyle")} values={profile?.travel_style} namespace="travelStyles" />
          <TagRow label={t("profile.originCountries")} values={originCountries} namespace="originCountries" />
        </Card>
      ) : null}
    </View>
  );
}
