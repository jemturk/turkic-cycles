import { Image, Text, View } from "react-native";

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size: number;
};

// Shared by every place a user's picture shows up (own profile, other profiles,
// circle members, chat, connections, settings) -- falls back to an initial-letter
// circle when avatar_url isn't set, which is every profile until this feature,
// and still whenever someone hasn't uploaded a photo.
export function Avatar({ uri, name, size }: AvatarProps) {
  const initial = (name || "?").charAt(0).toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={name ? `${name}'s photo` : "Profile photo"}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-coral-500"
      style={{ width: size, height: size }}
    >
      <Text className="font-semibold text-white" style={{ fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </View>
  );
}
