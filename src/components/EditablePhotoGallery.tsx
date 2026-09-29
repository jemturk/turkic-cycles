import { useLayoutEffect, useRef, useState, useCallback } from "react";
import { Alert, Image, LayoutAnimation, PanResponder, Platform, Pressable, Text, UIManager, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import type { ProfilePhoto } from "@/api/gallery";
import { MAX_PROFILE_PHOTOS, useAddProfilePhotos, useRemoveProfilePhoto, useReorderProfilePhotos } from "@/hooks/useGallery";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLUMNS = 3;
const GAP = 8;

// Mirrors the latest value into a ref so PanResponder's callbacks (created once
// via useRef and never recreated) can always read current props/state instead of
// closing over whatever they were on the render that created the responder.
// The write happens in a layout effect, not during render, so React's own
// rendering isn't the one mutating the ref.
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

type TileProps = {
  photo: ProfilePhoto;
  index: number;
  tileSize: number;
  totalCount: number;
  onDragStart: () => void;
  onDrop: (fromIndex: number, dx: number, dy: number, tileSize: number, totalCount: number) => void;
  onRemove: (photo: ProfilePhoto) => void;
};

function GalleryTile({ photo, index, tileSize, totalCount, onDragStart, onDrop, onRemove }: TileProps) {
  const { t } = useTranslation();
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null);
  const latest = useLatest({ index, tileSize, totalCount, onDragStart, onDrop });

  // Deliberately never claims the responder on start (only once real dragging
  // motion crosses the threshold in onMoveShouldSetPanResponder) -- a plain tap on
  // this tile, including a tap that lands on the nested remove button, is left
  // alone to reach that button's own Pressable instead of being swallowed here.
  //
  // `useRef(PanResponder.create(...)).current` is the standard PanResponder
  // pattern straight from React Native's own docs: the instance is created once
  // and never mutated afterward, so reading .current here (and spreading
  // .panHandlers from it below) is safe even though the lint rule can't
  // distinguish a stable, write-once ref from one that changes.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
      onPanResponderGrant: () => latest.current.onDragStart(),
      onPanResponderMove: (_, gesture) => setOffset({ dx: gesture.dx, dy: gesture.dy }),
      onPanResponderRelease: (_, gesture) => {
        const { index, tileSize, totalCount, onDrop } = latest.current;
        onDrop(index, gesture.dx, gesture.dy, tileSize, totalCount);
        setOffset(null);
      },
      onPanResponderTerminate: () => setOffset(null),
    })
  ).current;

  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const left = col * (tileSize + GAP) + (offset?.dx ?? 0);
  const top = row * (tileSize + GAP) + (offset?.dy ?? 0);

  return (
    <View
      // eslint-disable-next-line react-hooks/refs
      {...panResponder.panHandlers}
      style={{
        position: "absolute",
        left,
        top,
        width: tileSize,
        height: tileSize,
        zIndex: offset ? 10 : 0,
      }}
    >
      <Image source={{ uri: photo.url }} style={{ width: tileSize, height: tileSize, borderRadius: 12 }} />
      <Pressable
        className="absolute -right-1.5 -top-1.5 items-center justify-center rounded-full bg-ink-900/80 p-1"
        onPress={() => onRemove(photo)}
        accessibilityLabel={t("gallery.removePhoto")}
      >
        <Ionicons name="close" size={14} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export function EditablePhotoGallery({ userId, photos }: { userId: string; photos: ProfilePhoto[] | undefined }) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<ProfilePhoto[]>(photos ?? []);
  const [syncedPhotos, setSyncedPhotos] = useState(photos);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const addPhotos = useAddProfilePhotos(userId);
  const removePhoto = useRemoveProfilePhoto(userId);
  const reorderPhotos = useReorderProfilePhotos(userId);

  // Adjusts `order` during render when the server list changes, rather than via a
  // useEffect -- the react.dev-recommended way to reset state in response to a
  // prop change without an extra render/commit cycle. Never resyncs mid-drag: a
  // background refetch landing while a tile is being dragged would otherwise yank
  // the grid out from under the user's finger.
  if (photos !== syncedPhotos && !isDragging) {
    setSyncedPhotos(photos);
    setOrder(photos ?? []);
  }

  const tileSize = containerWidth > 0 ? (containerWidth - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const canAddMore = order.length < MAX_PROFILE_PHOTOS;
  const rowCount = Math.ceil((order.length + (canAddMore ? 1 : 0)) / COLUMNS) || 1;
  const gridHeight = rowCount * tileSize + (rowCount - 1) * GAP;

  const handleDrop = useCallback(
    (fromIndex: number, dx: number, dy: number, size: number, totalCount: number) => {
      setIsDragging(false);
      if (size <= 0) return;

      const colDelta = Math.round(dx / (size + GAP));
      const rowDelta = Math.round(dy / (size + GAP));
      const fromCol = fromIndex % COLUMNS;
      const fromRow = Math.floor(fromIndex / COLUMNS);
      const targetCol = Math.min(COLUMNS - 1, Math.max(0, fromCol + colDelta));
      const targetRow = Math.max(0, fromRow + rowDelta);
      const targetIndex = Math.min(totalCount - 1, targetRow * COLUMNS + targetCol);

      if (targetIndex === fromIndex) return;

      setOrder((current) => {
        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(targetIndex, 0, moved);
        if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        reorderPhotos.mutate(next.map((p) => p.id), {
          onError: (error) => {
            Alert.alert(t("gallery.reorderErrorTitle"), error.message);
            setOrder(photos ?? []);
          },
        });
        return next;
      });
    },
    [reorderPhotos, t, photos]
  );

  async function onAddPress() {
    const remaining = MAX_PROFILE_PHOTOS - order.length;
    if (remaining <= 0) {
      Alert.alert(t("gallery.maxReachedTitle"), t("gallery.maxReachedBody", { max: MAX_PROFILE_PHOTOS }));
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("gallery.photoAccessNeededTitle"), t("gallery.photoAccessNeededBody"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;

    addPhotos.mutate(
      result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" })),
      { onError: (error) => Alert.alert(t("gallery.uploadErrorTitle"), error.message) }
    );
  }

  function onRemove(photo: ProfilePhoto) {
    setOrder((current) => current.filter((p) => p.id !== photo.id));
    removePhoto.mutate(photo, {
      onError: (error) => {
        Alert.alert(t("gallery.removeErrorTitle"), error.message);
        setOrder(photos ?? []);
      },
    });
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("gallery.title")}</Text>
      <View
        style={{ height: tileSize > 0 ? gridHeight : undefined, minHeight: 1 }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {tileSize > 0
          ? order.map((photo, index) => (
              <GalleryTile
                key={photo.id}
                photo={photo}
                index={index}
                tileSize={tileSize}
                totalCount={order.length}
                onDragStart={() => setIsDragging(true)}
                onDrop={handleDrop}
                onRemove={onRemove}
              />
            ))
          : null}

        {tileSize > 0 && canAddMore ? (
          <Pressable
            onPress={onAddPress}
            disabled={addPhotos.isPending}
            className="absolute items-center justify-center rounded-xl border-2 border-dashed border-coral-100 dark:border-ink-600"
            style={{
              left: (order.length % COLUMNS) * (tileSize + GAP),
              top: Math.floor(order.length / COLUMNS) * (tileSize + GAP),
              width: tileSize,
              height: tileSize,
            }}
          >
            <Ionicons name="add" size={28} color="#D9663D" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
