import { useLayoutEffect, useRef, useState, useCallback } from "react";
import { Image, LayoutAnimation, PanResponder, Platform, Pressable, UIManager, View } from "react-native";
import { Text } from "@/components/Text";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { COVER_POSITION, type ProfilePhoto } from "@/api/gallery";
import { MAX_PROFILE_PHOTOS, useAddProfilePhotos, useRemoveProfilePhoto, useReorderProfilePhotos } from "@/hooks/useGallery";
import { useDiscoverCardAspect } from "@/lib/discoverCard";
import { CoverPreviewModal } from "@/components/CoverPreviewModal";
import { showAlert } from "@/lib/alert";
import { photoUploadErrorMessage } from "@/lib/photoErrors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLUMNS = 3;
const GAP = 8;

type NewPhoto = { uri: string };

// A cover change waiting on the preview: a new upload, or the photos in the order
// they'll take if confirmed (the first one becoming the cover).
type PendingCover = { kind: "upload"; asset: NewPhoto } | { kind: "existing"; newOrder: ProfilePhoto[] };

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

function slotPosition(slot: number, tileSize: number) {
  return {
    left: (slot % COLUMNS) * (tileSize + GAP),
    top: Math.floor(slot / COLUMNS) * (tileSize + GAP),
  };
}

function CoverTag() {
  const { t } = useTranslation();
  return (
    <View className="absolute bottom-1.5 left-1.5 flex-row items-center gap-1 rounded-full bg-primary-500 px-2 py-0.5">
      <Ionicons name="albums-outline" size={11} color="#FFFFFF" />
      <Text className="text-[11px] font-semibold text-white">{t("gallery.coverBadge")}</Text>
    </View>
  );
}

type TileProps = {
  photo: ProfilePhoto;
  slot: number;
  slotCount: number;
  tileSize: number;
  isCover: boolean;
  onMakeCover?: (photo: ProfilePhoto) => void;
  onDragStart: () => void;
  onDragCancel: () => void;
  onDrop: (fromSlot: number, dx: number, dy: number, tileSize: number, slotCount: number) => void;
  onRemove: (photo: ProfilePhoto) => void;
};

function GalleryTile({
  photo,
  slot,
  slotCount,
  tileSize,
  isCover,
  onMakeCover,
  onDragStart,
  onDragCancel,
  onDrop,
  onRemove,
}: TileProps) {
  const { t } = useTranslation();
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null);
  const latest = useLatest({ slot, tileSize, slotCount, onDragStart, onDragCancel, onDrop });

  // Deliberately never claims the responder on start (only once real dragging
  // motion crosses the threshold in onMoveShouldSetPanResponder) -- a plain tap on
  // this tile, including one on the nested remove / make-cover buttons, is left
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
        const { slot, tileSize, slotCount, onDrop } = latest.current;
        onDrop(slot, gesture.dx, gesture.dy, tileSize, slotCount);
        setOffset(null);
      },
      // The surrounding ScrollView (or the OS) can take the gesture over mid-drag --
      // common on iOS when the page scrolls. The parent has to hear about that too,
      // or it stays "dragging" and stops picking up the server list (new uploads).
      onPanResponderTerminate: () => {
        setOffset(null);
        latest.current.onDragCancel();
      },
    })
  ).current;

  const { left, top } = slotPosition(slot, tileSize);

  return (
    <View
      // eslint-disable-next-line react-hooks/refs
      {...panResponder.panHandlers}
      style={{
        position: "absolute",
        left: left + (offset?.dx ?? 0),
        top: top + (offset?.dy ?? 0),
        width: tileSize,
        height: tileSize,
        zIndex: offset ? 10 : 0,
      }}
    >
      <Image source={{ uri: photo.url }} style={{ width: tileSize, height: tileSize, borderRadius: 12 }} />
      {isCover ? <CoverTag /> : null}
      {onMakeCover ? (
        // Centred on the photo. box-none: only the pill itself takes taps, so the
        // rest of the tile still drags.
        <View className="absolute inset-0 items-center justify-center px-1.5" style={{ pointerEvents: "box-none" }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onMakeCover(photo)}
            className="max-w-full items-center rounded-full bg-white/90 px-3 py-1.5"
          >
            <Text className="text-[11px] font-semibold text-primary-600" numberOfLines={1}>
              {t("gallery.makeCover")}
            </Text>
          </Pressable>
        </View>
      ) : null}
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

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// The user's own photos, editable. Slot 0 is the cover -- the background of their
// Discover and Connections cards (see COVER_POSITION): it holds the cover photo,
// or, once that's removed, an empty "+" tile, and the other photos then offer
// "Make cover". Every change of cover goes through CoverPreviewModal first.
export function EditablePhotoGallery({ userId, photos }: { userId: string; photos: ProfilePhoto[] | undefined }) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<ProfilePhoto[]>(photos ?? []);
  const [hasCover, setHasCover] = useState(photos?.[0]?.position === COVER_POSITION);
  const [syncedPhotos, setSyncedPhotos] = useState(photos);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingCover, setPendingCover] = useState<PendingCover | null>(null);
  const [isSavingCover, setIsSavingCover] = useState(false);

  const addPhotos = useAddProfilePhotos(userId);
  const removePhoto = useRemoveProfilePhoto(userId);
  const reorderPhotos = useReorderProfilePhotos(userId);
  const cardAspect = useDiscoverCardAspect();

  // Adjusts local state during render when the server list changes, rather than
  // via a useEffect -- the react.dev-recommended way to reset state in response to
  // a prop change without an extra render/commit cycle. Never resyncs mid-drag: a
  // background refetch landing while a tile is being dragged would otherwise yank
  // the grid out from under the user's finger.
  if (photos !== syncedPhotos && !isDragging) {
    setSyncedPhotos(photos);
    setOrder(photos ?? []);
    setHasCover(photos?.[0]?.position === COVER_POSITION);
  }

  // Slot 0 is the cover slot; null = empty.
  const slots: (ProfilePhoto | null)[] = hasCover ? order : [null, ...order];
  const tileSize = containerWidth > 0 ? (containerWidth - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  // The regular "+" tile, after the photos. With nothing at all yet, only the
  // cover slot shows, so the cover comes first.
  const canAddMore = order.length < MAX_PROFILE_PHOTOS && (hasCover || order.length > 0);
  const rowCount = Math.ceil((slots.length + (canAddMore ? 1 : 0)) / COLUMNS) || 1;
  const gridHeight = rowCount * tileSize + (rowCount - 1) * GAP;

  function revert() {
    setOrder(photos ?? []);
    setHasCover(photos?.[0]?.position === COVER_POSITION);
  }

  const handleDrop = useCallback(
    (fromSlot: number, dx: number, dy: number, size: number, slotCount: number) => {
      setIsDragging(false);
      if (size <= 0) return;

      const colDelta = Math.round(dx / (size + GAP));
      const rowDelta = Math.round(dy / (size + GAP));
      const targetCol = Math.min(COLUMNS - 1, Math.max(0, (fromSlot % COLUMNS) + colDelta));
      const targetRow = Math.max(0, Math.floor(fromSlot / COLUMNS) + rowDelta);
      const targetSlot = Math.min(slotCount - 1, targetRow * COLUMNS + targetCol);
      if (targetSlot === fromSlot) return;

      // Photo indexes in `order` (with an empty cover slot, photos start at slot 1).
      const offset = hasCover ? 0 : 1;
      const fromIndex = fromSlot - offset;

      if (!hasCover && targetSlot === 0) {
        // Dropped into the empty cover slot: preview it as the new cover first.
        const moved = order[fromIndex];
        setPendingCover({ kind: "existing", newOrder: [moved, ...order.filter((p) => p.id !== moved.id)] });
        return;
      }

      const next = move(order, fromIndex, targetSlot - offset);
      if (hasCover && next[0].id !== order[0].id) {
        // The cover would change (a photo dragged into slot 0, or the cover dragged
        // out of it): preview first; the grid stays as it was until confirmed.
        setPendingCover({ kind: "existing", newOrder: next });
        return;
      }

      if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOrder(next);
      reorderPhotos.mutate(
        { ids: next.map((p) => p.id), startPosition: hasCover ? COVER_POSITION : COVER_POSITION + 1 },
        {
          onError: (error) => {
            showAlert(t("gallery.reorderErrorTitle"), error.message);
            revert();
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasCover, order, reorderPhotos, t, photos]
  );

  async function requestLibrary(): Promise<boolean> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(t("gallery.photoAccessNeededTitle"), t("gallery.photoAccessNeededBody"));
      return false;
    }
    return true;
  }

  // The empty cover slot's "+": one photo with a crop step framed to this device's
  // Discover card shape (Android only -- iOS's picker always crops square; the card
  // scales whatever it gets to fill, so either way it shows uniformly), then the
  // preview.
  async function onAddCoverPress() {
    if (order.length >= MAX_PROFILE_PHOTOS) {
      showAlert(t("gallery.maxReachedTitle"), t("gallery.maxReachedBody", { max: MAX_PROFILE_PHOTOS }));
      return;
    }
    if (!(await requestLibrary())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: cardAspect,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setPendingCover({ kind: "upload", asset: { uri: asset.uri } });
  }

  // The regular "+": any number of non-cover photos at once (cropping and
  // multi-select can't be combined, so these skip the crop).
  async function onAddPress() {
    const remaining = MAX_PROFILE_PHOTOS - order.length;
    if (remaining <= 0) {
      showAlert(t("gallery.maxReachedTitle"), t("gallery.maxReachedBody", { max: MAX_PROFILE_PHOTOS }));
      return;
    }
    if (!(await requestLibrary())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;
    addPhotos.mutate(
      { photos: result.assets.map((asset) => ({ uri: asset.uri })) },
      { onError: (error) => showAlert(t("gallery.uploadErrorTitle"), photoUploadErrorMessage(error, t)) }
    );
  }

  function onMakeCover(photo: ProfilePhoto) {
    setPendingCover({ kind: "existing", newOrder: [photo, ...order.filter((p) => p.id !== photo.id)] });
  }

  async function onConfirmCover() {
    if (!pendingCover) return;
    setIsSavingCover(true);
    try {
      if (pendingCover.kind === "upload") {
        await addPhotos.mutateAsync({ photos: [pendingCover.asset], asCover: true });
      } else {
        await reorderPhotos.mutateAsync({ ids: pendingCover.newOrder.map((p) => p.id), startPosition: COVER_POSITION });
        if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOrder(pendingCover.newOrder);
      }
      setHasCover(true);
      setPendingCover(null);
    } catch (error) {
      showAlert(t("gallery.uploadErrorTitle"), photoUploadErrorMessage(error as Error, t));
    } finally {
      setIsSavingCover(false);
    }
  }

  // Removing the cover leaves its slot empty -- the next photo is never promoted
  // on its own; the user picks the new cover.
  function onRemove(photo: ProfilePhoto) {
    const wasCover = hasCover && order[0]?.id === photo.id;
    setOrder((current) => current.filter((p) => p.id !== photo.id));
    if (wasCover) setHasCover(false);
    removePhoto.mutate(photo, {
      onError: (error) => {
        showAlert(t("gallery.removeErrorTitle"), error.message);
        revert();
      },
    });
  }

  const note = hasCover ? t("gallery.coverNote") : order.length > 0 ? t("gallery.coverNoteChoose") : t("gallery.coverNoteEmpty");

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("gallery.title")}</Text>
      <View
        style={{ height: tileSize > 0 ? gridHeight : undefined, minHeight: 1 }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {tileSize > 0 && !hasCover ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("gallery.addCover")}
            onPress={onAddCoverPress}
            disabled={addPhotos.isPending}
            className="absolute items-center justify-center rounded-xl border-2 border-dashed border-primary-500/50 dark:border-ink-600"
            style={{ ...slotPosition(0, tileSize), width: tileSize, height: tileSize }}
          >
            <Ionicons name="add" size={28} color="#127A87" />
            <CoverTag />
          </Pressable>
        ) : null}

        {tileSize > 0
          ? order.map((photo, index) => (
              <GalleryTile
                key={photo.id}
                photo={photo}
                slot={index + (hasCover ? 0 : 1)}
                slotCount={slots.length}
                tileSize={tileSize}
                isCover={hasCover && index === 0}
                onMakeCover={hasCover ? undefined : onMakeCover}
                onDragStart={() => setIsDragging(true)}
                onDragCancel={() => setIsDragging(false)}
                onDrop={handleDrop}
                onRemove={onRemove}
              />
            ))
          : null}

        {tileSize > 0 && canAddMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("gallery.addPhotos")}
            onPress={onAddPress}
            disabled={addPhotos.isPending}
            className="absolute items-center justify-center rounded-xl border-2 border-dashed border-primary-100 dark:border-ink-600"
            style={{ ...slotPosition(slots.length, tileSize), width: tileSize, height: tileSize }}
          >
            <Ionicons name="add" size={28} color="#127A87" />
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row gap-1.5">
        <Ionicons name="information-circle-outline" size={16} color="#127A87" />
        <Text className="flex-1 text-xs text-ink-700 dark:text-ink-200">{note}</Text>
      </View>

      <CoverPreviewModal
        userId={userId}
        photoUri={
          pendingCover ? (pendingCover.kind === "upload" ? pendingCover.asset.uri : pendingCover.newOrder[0].url) : null
        }
        isSaving={isSavingCover}
        onCancel={() => setPendingCover(null)}
        onConfirm={onConfirmCover}
      />
    </View>
  );
}
