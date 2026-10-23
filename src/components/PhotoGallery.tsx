import { useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import type { ProfilePhoto } from "@/api/gallery";
import { PhotoViewer } from "@/components/PhotoViewer";

const THUMB_SIZE = 88;
// Desktop web: a grid of large tiles instead of the phone's thumbnail strip.
const GRID_COLUMNS = 4;
const GRID_GAP = 10;

// Read-only photo strip for viewing someone else's profile -- the signed-in user's
// own profile uses EditablePhotoGallery instead, the same split as Avatar/EditableAvatar.
// Tapping a thumbnail opens it full-screen (PhotoViewer). `grid` lays the photos out
// as square tiles filling the width (desktop web).
export function PhotoGallery({ photos, grid = false }: { photos: ProfilePhoto[] | undefined; grid?: boolean }) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  if (!photos || photos.length === 0) return null;

  const tile = width > 0 ? Math.floor((width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS) : 0;

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("gallery.title")}</Text>
      {grid ? (
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}
        >
          {tile > 0
            ? photos.map((photo, index) => (
                <Pressable
                  key={photo.id}
                  onPress={() => setOpenIndex(index)}
                  accessibilityRole="imagebutton"
                  className="web:hover:opacity-90"
                >
                  <Image source={{ uri: photo.url }} style={{ width: tile, height: tile, borderRadius: 14 }} />
                </Pressable>
              ))
            : null}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {photos.map((photo, index) => (
            <Pressable key={photo.id} onPress={() => setOpenIndex(index)} accessibilityRole="imagebutton">
              <Image source={{ uri: photo.url }} style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 12 }} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <PhotoViewer
        uris={photos.map((p) => p.url)}
        index={openIndex}
        onChangeIndex={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </View>
  );
}
