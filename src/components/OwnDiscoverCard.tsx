import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { DiscoverCardView } from "@/components/DiscoverCardView";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyConnectionTypes } from "@/hooks/useOnboarding";
import { useOriginCountriesWithConsent } from "@/hooks/useDiscover";
import { useMyVerificationStatus } from "@/hooks/useVerification";
import { useDiscoverCardSize } from "@/lib/discoverCard";

// The signed-in user's own Discover card, drawn by the same DiscoverCardView the deck
// uses, at this device's real card size -- scaled down only if `maxHeight` can't fit
// it. The place line comes from the profile's city/state/country, which the database
// already masks to Location shown, and origin countries go through the same consent
// check others see, so this is what other people are actually shown.
export function OwnDiscoverCard({
  userId,
  coverUri,
  maxHeight,
}: {
  userId: string;
  // The background photo: the current cover, or a candidate one being previewed.
  coverUri: string | null;
  maxHeight: number;
}) {
  const { t } = useTranslation();
  const card = useDiscoverCardSize();
  const { data: profile } = useMyProfile(userId);
  const { data: connectionTypes } = useMyConnectionTypes(userId);
  const { data: originCountries } = useOriginCountriesWithConsent(userId);
  const { data: verification } = useMyVerificationStatus(userId);
  const scale = Math.min(1, maxHeight / card.height);

  // The card at full size inside a box of the scaled size: scaling shrinks around the
  // centre, so the inner card is centred on the box.
  return (
    <View style={{ width: card.width * scale, height: card.height * scale }}>
      <View
        style={{
          position: "absolute",
          width: card.width,
          height: card.height,
          left: (card.width * scale - card.width) / 2,
          top: (card.height * scale - card.height) / 2,
          transform: [{ scale }],
        }}
      >
        <DiscoverCardView
          person={{
            displayName: profile?.display_name || t("common.member"),
            avatarUrl: profile?.avatar_url ?? null,
            birthdate: profile?.birthdate ?? null,
            city: profile?.city ?? null,
            state: profile?.state ?? null,
            country: profile?.country ?? null,
            occupation: profile?.occupation ?? null,
            originCountries: originCountries ?? [],
            connectionTypes: connectionTypes ?? [],
            coverPhotoUrl: coverUri,
          }}
          verificationStatus={verification?.status}
        />
      </View>
    </View>
  );
}
