import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { EditableAvatar } from "@/components/EditableAvatar";
import { EditablePhotoGallery } from "@/components/EditablePhotoGallery";
import type { ProfilePhoto } from "@/api/gallery";

// Your own photos in one place: the profile picture picker first, then the gallery
// (cover and the rest). Used where the picker isn't already at hand -- Edit profile,
// and your profile on desktop web, whose card on the left has no camera button.
export function OwnPhotos({
  userId,
  avatarUrl,
  name,
  photos,
}: {
  userId: string;
  avatarUrl: string | null | undefined;
  name: string | null | undefined;
  photos: ProfilePhoto[] | undefined;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-start gap-4">
      {/* pt-7 lines the picture up with the gallery's tiles, under its "Photos" label. */}
      <View className="items-center gap-2 pt-7">
        <EditableAvatar userId={userId} uri={avatarUrl} name={name} size={96} />
        <Text className="text-xs font-medium text-ink-700 dark:text-ink-200">{t("avatar.profilePhoto")}</Text>
      </View>
      <View className="flex-1">
        <EditablePhotoGallery userId={userId} photos={photos} />
      </View>
    </View>
  );
}
