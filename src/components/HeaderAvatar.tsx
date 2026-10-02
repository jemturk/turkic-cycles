import { Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { useSession } from "@/hooks/useSession";
import { useMyProfile } from "@/hooks/useProfile";
import { Avatar } from "@/components/Avatar";

// replace, not push -- see goToProfile in connections/index.tsx; "me" is a hidden
// tab like "user", so this keeps your profile off whichever tab you tapped from.
export function HeaderAvatar({ size }: { size: number }) {
  const { t } = useTranslation();
  const { session } = useSession();
  const { data: profile } = useMyProfile(session?.user.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("profile.myProfile")}
      hitSlop={8}
      onPress={() => router.push("/(app)/me")}
    >
      <Avatar uri={profile?.avatar_url} name={profile?.display_name} size={size} />
    </Pressable>
  );
}
