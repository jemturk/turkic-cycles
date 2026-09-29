import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import type { ProfilePhoto } from "@/api/gallery";

const THUMB_SIZE = 88;

// Read-only photo strip for viewing someone else's profile -- the signed-in user's
// own profile uses EditablePhotoGallery instead, the same split as Avatar/EditableAvatar.
export function PhotoGallery({ photos }: { photos: ProfilePhoto[] | undefined }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("gallery.title")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {photos.map((photo, index) => (
          <Pressable key={photo.id} onPress={() => setOpenIndex(index)}>
            <Image
              source={{ uri: photo.url }}
              style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 12 }}
            />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={openIndex !== null} transparent animationType="fade" onRequestClose={() => setOpenIndex(null)}>
        <View className="flex-1 items-center justify-center bg-black/90" style={{ paddingTop: insets.top }}>
          {openIndex !== null ? (
            <Image
              source={{ uri: photos[openIndex].url }}
              style={{ width: "100%", height: "70%" }}
              resizeMode="contain"
            />
          ) : null}

          <Pressable
            className="absolute right-4 items-center justify-center rounded-full bg-black/50 p-2"
            style={{ top: insets.top + 12 }}
            onPress={() => setOpenIndex(null)}
            accessibilityLabel={t("common.cancel")}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          {openIndex !== null && openIndex > 0 ? (
            <Pressable
              className="absolute left-2 items-center justify-center rounded-full bg-black/50 p-2"
              onPress={() => setOpenIndex((i) => (i ?? 0) - 1)}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
          ) : null}
          {openIndex !== null && openIndex < photos.length - 1 ? (
            <Pressable
              className="absolute right-2 items-center justify-center rounded-full bg-black/50 p-2"
              onPress={() => setOpenIndex((i) => (i ?? 0) + 1)}
            >
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
