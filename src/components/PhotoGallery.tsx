import { useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import type { ProfilePhoto } from "@/api/gallery";
import { PhotoViewer } from "@/components/PhotoViewer";

const THUMB_SIZE = 88;

// Read-only photo strip for viewing someone else's profile -- the signed-in user's
// own profile uses EditablePhotoGallery instead, the same split as Avatar/EditableAvatar.
// Tapping a thumbnail opens it full-screen (PhotoViewer).
export function PhotoGallery({ photos }: { photos: ProfilePhoto[] | undefined }) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("gallery.title")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {photos.map((photo, index) => (
          <Pressable key={photo.id} onPress={() => setOpenIndex(index)} accessibilityRole="imagebutton">
            <Image source={{ uri: photo.url }} style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 12 }} />
          </Pressable>
        ))}
      </ScrollView>

      <PhotoViewer
        uris={photos.map((p) => p.url)}
        index={openIndex}
        onChangeIndex={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </View>
  );
}
