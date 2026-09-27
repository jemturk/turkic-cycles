import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { useUploadAvatar } from "@/hooks/useAvatar";
import { Avatar } from "@/components/Avatar";

type EditableAvatarProps = {
  userId: string;
  uri?: string | null;
  name?: string | null;
  size: number;
};

// Tap-to-change wrapper around Avatar, used only on the signed-in user's own
// profile -- other people's profiles render a plain, non-interactive Avatar.
export function EditableAvatar({ userId, uri, name, size }: EditableAvatarProps) {
  const uploadAvatar = useUploadAvatar(userId);

  async function onPress() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Enable photo access in Settings to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    uploadAvatar.mutate(
      { uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" },
      { onError: (error) => Alert.alert("Couldn't upload photo", error.message) }
    );
  }

  return (
    <Pressable onPress={onPress} disabled={uploadAvatar.isPending} accessibilityLabel="Change profile picture">
      <Avatar uri={uri} name={name} size={size} />
      {uploadAvatar.isPending ? (
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
  );
}
