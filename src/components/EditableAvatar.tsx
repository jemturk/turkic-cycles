import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useDeleteAvatar, useUploadAvatar } from "@/hooks/useAvatar";
import { Avatar } from "@/components/Avatar";

type EditableAvatarProps = {
  userId: string;
  uri?: string | null;
  name?: string | null;
  size: number;
};

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

// Tap-to-change wrapper around Avatar, used only on the signed-in user's own
// profile -- other people's profiles render a plain, non-interactive Avatar.
export function EditableAvatar({ userId, uri, name, size }: EditableAvatarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const uploadAvatar = useUploadAvatar(userId);
  const deleteAvatar = useDeleteAvatar(userId);
  const isPending = uploadAvatar.isPending || deleteAvatar.isPending;
  const [sheetVisible, setSheetVisible] = useState(false);

  function onRemove() {
    setSheetVisible(false);
    deleteAvatar.mutate(undefined, {
      onError: (error) => Alert.alert(t("avatar.removeErrorTitle"), error.message),
    });
  }

  async function pickFrom(source: "camera" | "library") {
    setSheetVisible(false);

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        source === "camera" ? t("avatar.cameraAccessNeededTitle") : t("avatar.photoAccessNeededTitle"),
        source === "camera" ? t("avatar.cameraAccessNeededBody") : t("avatar.photoAccessNeededBody")
      );
      return;
    }

    // A profile picture is a selfie almost by definition -- front camera by default,
    // same as every other app's "take a profile picture" flow.
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ ...PICKER_OPTIONS, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    // Web doesn't reliably report `canceled` for the camera capture flow, so also
    // bail out if there's simply no asset to upload.
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    uploadAvatar.mutate(
      { uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" },
      { onError: (error) => Alert.alert(t("avatar.uploadErrorTitle"), error.message) }
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setSheetVisible(true)}
        disabled={isPending}
        accessibilityLabel={t("avatar.changePhoto")}
      >
        <Avatar uri={uri} name={name} size={size} />
        {isPending ? (
          <View
            className="absolute items-center justify-center rounded-full bg-ink-900/40"
            style={{ width: size, height: size }}
          >
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : (
          <View className="absolute bottom-0 right-0 items-center justify-center rounded-full bg-coral-500 p-1.5">
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        )}
      </Pressable>

      <Modal
        transparent
        visible={sheetVisible}
        animationType="fade"
        onRequestClose={() => setSheetVisible(false)}
      >
        <View
          className="flex-1 justify-end bg-black/50 px-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {/* Two separate cards (options, then Cancel) rather than one shared
              container: each shrink-wraps to its own content independently, so
              there's no single flex-stretching container that could end up with
              unexplained extra space around whichever row happens to be last. */}
          <View className="gap-1 rounded-3xl bg-white dark:bg-ink-800 p-2">
            <Pressable
              className="flex-row items-center gap-3 rounded-2xl p-3"
              onPress={() => pickFrom("camera")}
            >
              <Ionicons name="camera-outline" size={22} color="#D9663D" />
              <Text className="text-base text-ink-900 dark:text-ink-50">{t("avatar.takePhoto")}</Text>
            </Pressable>
            <Pressable
              className="flex-row items-center gap-3 rounded-2xl p-3"
              onPress={() => pickFrom("library")}
            >
              <Ionicons name="image-outline" size={22} color="#D9663D" />
              <Text className="text-base text-ink-900 dark:text-ink-50">{t("avatar.chooseFromLibrary")}</Text>
            </Pressable>
            {uri ? (
              <Pressable className="flex-row items-center gap-3 rounded-2xl p-3" onPress={onRemove}>
                <Ionicons name="trash-outline" size={22} color="#C24F2A" />
                <Text className="text-base text-coral-600">{t("avatar.removePhoto")}</Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            className="mt-2 items-center rounded-3xl bg-white dark:bg-ink-800 p-3.5"
            onPress={() => setSheetVisible(false)}
          >
            <Text className="text-base font-semibold text-ink-900 dark:text-ink-50">{t("common.cancel")}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
