import { Modal, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { OwnDiscoverCard } from "@/components/OwnDiscoverCard";

// Title, subtitle, button and spacing around the card.
const CHROME_HEIGHT = 230;

// "Your Discover card", opened from the top of your own profile: exactly what other
// members see in Discover, with the current cover photo and the place line as Location
// shown allows.
export function MyDiscoverCardModal({
  userId,
  coverUri,
  visible,
  onClose,
}: {
  userId: string;
  coverUri: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View
        className="mx-auto w-full max-w-[480px] flex-1 items-center gap-5 bg-primary-50 dark:bg-ink-950 px-6"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <View className="w-full gap-1">
          <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{t("profile.discoverCardTitle")}</Text>
          <Text className="text-sm text-ink-700 dark:text-ink-200">{t("profile.discoverCardBody")}</Text>
        </View>

        {visible ? (
          <OwnDiscoverCard
            userId={userId}
            coverUri={coverUri}
            maxHeight={windowHeight - insets.top - insets.bottom - CHROME_HEIGHT}
          />
        ) : null}

        <View className="w-full">
          <Button label={t("common.close")} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
