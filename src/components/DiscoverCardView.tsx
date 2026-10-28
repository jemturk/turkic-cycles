import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MatchSummary } from "@/components/MatchSummary";
import { calculateAge } from "@/lib/age";
import type { DiscoverCandidate } from "@/api/discover";

export type DiscoverCardPerson = Pick<
  DiscoverCandidate,
  | "displayName"
  | "avatarUrl"
  | "birthdate"
  | "city"
  | "state"
  | "occupation"
  | "originCountries"
  | "connectionTypes"
  | "coverPhotoUrl"
> &
  Partial<Pick<DiscoverCandidate, "match">>;

// What a person's Discover card looks like -- the one place it's drawn, so the
// deck and the cover-photo preview (CoverPreviewModal) can never drift apart.
// Fills its container; the caller decides the size.
//
// Background: the cover photo, scaled to fill and centre-cropped, so every card on
// a device is the same size whatever the photo's shape. Without a cover it falls
// back to turquoise with the profile picture in the middle.
export function DiscoverCardView({
  person,
  verificationStatus,
}: {
  person: DiscoverCardPerson;
  verificationStatus: string | null | undefined;
}) {
  const { t } = useTranslation();
  const cover = person.coverPhotoUrl;

  return (
    <View className="flex-1 justify-end overflow-hidden rounded-3xl bg-teal-500">
      {cover ? (
        <Image
          source={{ uri: cover }}
          resizeMode="cover"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View className="mb-8 items-center">
          <Avatar uri={person.avatarUrl} name={person.displayName} size={96} fallbackClassName="bg-white/30" />
        </View>
      )}

      {/* A dark band behind the text keeps it readable on any photo. */}
      <View className={`gap-2 p-6 ${cover ? "bg-ink-950/55" : ""}`}>
        <MatchSummary match={person.match} />
        <View className="flex-row items-center gap-2">
          {cover ? (
            <Avatar uri={person.avatarUrl} name={person.displayName} size={40} fallbackClassName="bg-white/30" />
          ) : null}
          <Text className="font-display text-2xl text-white">
            {person.displayName}
            {person.birthdate ? `, ${calculateAge(person.birthdate)}` : ""}
          </Text>
          <VerifiedBadge status={verificationStatus} color="white" />
        </View>
        <Text className="text-sm text-white/90">{[person.city, person.state].filter(Boolean).join(", ")}</Text>
        <View className="flex-row flex-wrap gap-2">
          {person.occupation ? (
            <View className="rounded-full bg-white/20 px-3 py-1">
              <Text className="text-xs font-medium text-white">{person.occupation}</Text>
            </View>
          ) : null}
          {person.originCountries.map((country) => (
            <View key={country} className="rounded-full bg-white/20 px-3 py-1">
              <Text className="text-xs font-medium text-white">{country}</Text>
            </View>
          ))}
          {person.connectionTypes.map((type) => (
            <View key={type} className="rounded-full bg-white/20 px-3 py-1">
              <Text className="text-xs font-medium text-white">
                {t("discover.lookingFor", { type: t(`constants.connectionTypes.${type}`) })}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
