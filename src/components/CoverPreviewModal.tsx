import { ActivityIndicator, Modal, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { DiscoverCardView } from "@/components/DiscoverCardView";
import { useMyProfile } from "@/hooks/useProfile";
import { useMyConnectionTypes } from "@/hooks/useOnboarding";
import { useOriginCountriesWithConsent } from "@/hooks/useDiscover";
import { useMyVerificationStatus } from "@/hooks/useVerification";
import { useDiscoverCardSize } from "@/lib/discoverCard";

// Title, subtitle, buttons and spacing around the card.
const CHROME_HEIGHT = 230;

// Shown before a new cover takes effect: the user's own Discover card, drawn by
// the same DiscoverCardView the deck uses, at this device's real card size (scaled
// down only if the screen can't fit it with the buttons), with the candidate photo
// as its background. Origin countries come through the same consent check others
// see, so the preview matches what other people will actually be shown.
export function CoverPreviewModal({
  userId,
  photoUri,
  isSaving,
  onCancel,
  onConfirm,
}: {
  userId: string;
  // null hides the modal.
  photoUri: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const card = useDiscoverCardSize();
  const { data: profile } = useMyProfile(userId);
  const { data: connectionTypes } = useMyConnectionTypes(userId);
  const { data: originCountries } = useOriginCountriesWithConsent(userId);
  const { data: verification } = useMyVerificationStatus(userId);

  const available = windowHeight - insets.top - insets.bottom - CHROME_HEIGHT;
  const scale = Math.min(1, available / card.height);

  return (
    <Modal visible={!!photoUri} animationType="fade" onRequestClose={() => !isSaving && onCancel()}>
      <View
        className="mx-auto w-full max-w-[480px] flex-1 items-center gap-5 bg-primary-50 dark:bg-ink-950 px-6"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <View className="w-full gap-1">
          <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{t("gallery.previewTitle")}</Text>
          <Text className="text-sm text-ink-700 dark:text-ink-200">{t("gallery.previewBody")}</Text>
        </View>

        {/* The card at full size inside a box of the scaled size: scaling shrinks
            around the centre, so the inner card is centred on the box. */}
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
            {photoUri ? (
              <DiscoverCardView
                person={{
                  displayName: profile?.display_name || t("common.member"),
                  avatarUrl: profile?.avatar_url ?? null,
                  birthdate: profile?.birthdate ?? null,
                  city: profile?.city ?? null,
                  state: profile?.state ?? null,
                  occupation: profile?.occupation ?? null,
                  originCountries: originCountries ?? [],
                  connectionTypes: connectionTypes ?? [],
                  coverPhotoUrl: photoUri,
                }}
                verificationStatus={verification?.status}
              />
            ) : null}
          </View>
        </View>

        {isSaving ? (
          <ActivityIndicator color="#127A87" />
        ) : (
          <View className="w-full flex-row gap-3">
            <View className="flex-1">
              <Button label={t("common.cancel")} variant="secondary" onPress={onCancel} />
            </View>
            <View className="flex-1">
              <Button label={t("gallery.previewConfirm")} onPress={onConfirm} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
