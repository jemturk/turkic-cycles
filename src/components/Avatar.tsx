import { Image, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size: number;
  /** Fallback (no-photo) circle background, for screens whose existing initials
   * circle doesn't use the default solid coral-500 (e.g. Discover's translucent
   * white-on-teal card). Defaults to "bg-coral-500". */
  fallbackClassName?: string;
};

// Shared by every place a user's picture shows up (own profile, other profiles,
// circle members, chat, connections, settings) -- falls back to an initial-letter
// circle when avatar_url isn't set, which is every profile until this feature,
// and still whenever someone hasn't uploaded a photo.
export function Avatar({ uri, name, size, fallbackClassName = "bg-coral-500" }: AvatarProps) {
  const { t } = useTranslation();
  const initial = (name || "?").charAt(0).toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={name ? t("avatar.namedPhoto", { name }) : t("avatar.profilePhoto")}
      />
    );
  }

  return (
    <View
      className={`items-center justify-center rounded-full ${fallbackClassName}`}
      style={{ width: size, height: size }}
    >
      <Text className="font-semibold text-white" style={{ fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </View>
  );
}
