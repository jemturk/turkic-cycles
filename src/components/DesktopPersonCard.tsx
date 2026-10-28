import type { ReactNode } from "react";
import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MatchSummary } from "@/components/MatchSummary";
import { calculateAge } from "@/lib/age";
import type { DiscoverCardPerson } from "@/components/DiscoverCardView";

export type DesktopPersonCardPerson = Omit<DiscoverCardPerson, "originCountries">;

// A person's card on desktop web -- the Discover grid (DiscoverGrid) and the left of
// a profile (ProfileView) -- so the two always match: the cover photo filling the
// card, and on a dark band their picture, name and age, "city · occupation", and
// short chips for what they're looking for. Fills its container; the caller sizes it
// and overlays anything else (Discover's buttons). `avatar` replaces the picture on
// the band, e.g. with the tap-to-change one on your own profile.
export function DesktopPersonCard({
  person,
  verificationStatus,
  avatar,
}: {
  person: DesktopPersonCardPerson;
  verificationStatus: string | null | undefined;
  avatar?: ReactNode;
}) {
  const { t } = useTranslation();
  const age = person.birthdate ? calculateAge(person.birthdate) : null;
  const meta = [[person.city, person.state].filter(Boolean).join(", "), person.occupation].filter(Boolean).join(" · ");
  const cover = person.coverPhotoUrl;

  return (
    <View className="flex-1 overflow-hidden rounded-3xl bg-teal-500">
      {cover ? (
        <Image
          source={{ uri: cover }}
          resizeMode="cover"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          accessibilityIgnoresInvertColors
        />
      ) : avatar ? null : (
        <View className="absolute inset-0 items-center justify-center pb-24">
          <Avatar uri={person.avatarUrl} name={person.displayName} size={96} fallbackClassName="bg-white/30" />
        </View>
      )}

      {/* A dark band behind the text keeps it readable on any photo, as on a phone. */}
      <View className={`absolute inset-x-0 bottom-0 gap-2 p-5 ${cover ? "bg-ink-950/55" : ""}`}>
        <MatchSummary match={person.match} />
        <View className="flex-row items-center gap-2">
          {avatar ??
            (cover ? (
              <Avatar uri={person.avatarUrl} name={person.displayName} size={36} fallbackClassName="bg-white/30" />
            ) : null)}
          <Text className="shrink font-display text-2xl text-white" numberOfLines={1}>
            {person.displayName}
            {age ? `, ${age}` : ""}
          </Text>
          <VerifiedBadge status={verificationStatus} color="white" />
        </View>
        {meta ? (
          <Text className="text-sm text-white/90" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {person.connectionTypes.length > 0 ? (
          <View className="flex-row flex-wrap gap-1.5">
            {person.connectionTypes.map((type) => (
              <View key={type} className="rounded-full bg-white/20 px-2.5 py-1">
                <Text className="text-xs font-medium text-white">{t(`constants.connectionTypes.${type}`)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
