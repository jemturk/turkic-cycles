import { ActivityIndicator, Modal, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { OwnDiscoverCard } from "@/components/OwnDiscoverCard";

// Title, subtitle, buttons and spacing around the card.
const CHROME_HEIGHT = 230;

// Shown before a new cover takes effect: the user's own Discover card (OwnDiscoverCard)
// with the candidate photo as its background.
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

  return (
    <Modal visible={!!photoUri} animationType="fade" onRequestClose={() => {
      if (!isSaving) onCancel();
    }}>
      <View
        className="mx-auto w-full max-w-[480px] flex-1 items-center gap-5 bg-primary-50 dark:bg-ink-950 px-6"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <View className="w-full gap-1">
          <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{t("gallery.previewTitle")}</Text>
          <Text className="text-sm text-ink-700 dark:text-ink-200">{t("gallery.previewBody")}</Text>
        </View>

        {photoUri ? (
          <OwnDiscoverCard
            userId={userId}
            coverUri={photoUri}
            maxHeight={windowHeight - insets.top - insets.bottom - CHROME_HEIGHT}
          />
        ) : null}

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
