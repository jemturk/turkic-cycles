import { Modal, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// Full-screen photo viewer over a dark backdrop, with previous/next arrows when
// there's more than one photo. Shared by the gallery strip (PhotoGallery) and the
// profile picture on someone's profile (ProfileView).
export function PhotoViewer({
  uris,
  index,
  onChangeIndex,
  onClose,
}: {
  uris: string[];
  // null = closed.
  index: number | null;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const uri = index !== null ? uris[index] : undefined;

  return (
    <Modal visible={index !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/90" style={{ paddingTop: insets.top }}>
        {uri ? <Image source={{ uri }} style={{ width: "100%", height: "70%" }} contentFit="contain" /> : null}

        <Pressable
          className="absolute right-4 items-center justify-center rounded-full bg-black/50 p-2"
          style={{ top: insets.top + 12 }}
          onPress={onClose}
          accessibilityLabel={t("common.close")}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>

        {index !== null && index > 0 ? (
          <Pressable
            className="absolute left-2 items-center justify-center rounded-full bg-black/50 p-2"
            onPress={() => onChangeIndex(index - 1)}
            accessibilityLabel={t("gallery.previousPhoto")}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {index !== null && index < uris.length - 1 ? (
          <Pressable
            className="absolute right-2 items-center justify-center rounded-full bg-black/50 p-2"
            onPress={() => onChangeIndex(index + 1)}
            accessibilityLabel={t("gallery.nextPhoto")}
          >
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}
