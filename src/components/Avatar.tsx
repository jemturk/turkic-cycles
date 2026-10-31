import { View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size: number;
  /** Fallback (no-photo) circle background, for screens whose initials circle
   * doesn't use the rotating colors (e.g. Discover's translucent white-on-teal
   * card). Defaults to one of FALLBACK_COLORS, picked by name. */
  fallbackClassName?: string;
};

// The app's three main colors -- turquoise, coral and gold -- for initials circles.
// Picked from the name, so a person keeps the same color everywhere they appear.
const FALLBACK_COLORS = ["bg-primary-500", "bg-accent-500", "bg-gold-600"];

function fallbackColor(name: string | null | undefined): string {
  let hash = 0;
  for (const char of name ?? "") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

// Shared by every place a user's picture shows up (own profile, other profiles,
// circle members, chat, connections, settings) -- falls back to an initial-letter
// circle when avatar_url isn't set, which is every profile until this feature,
// and still whenever someone hasn't uploaded a photo.
export function Avatar({ uri, name, size, fallbackClassName }: AvatarProps) {
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
      className={`items-center justify-center rounded-full ${fallbackClassName ?? fallbackColor(name)}`}
      style={{ width: size, height: size }}
    >
      <Text className="font-semibold text-white" style={{ fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </View>
  );
}
