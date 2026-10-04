import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type SwipeAction = "pass" | "save" | "like";

// Same look on the Discover deck and on a profile opened from it ("Red heart
// hero", set 4 of the Discover Button Colour Concepts canvas): Like is the one
// solid, loudest button, as people expect of the main action.
//   pass: pale coral tint, coral-red X
//   save: white, orange star
//   like: solid coral-red, white heart
// All three are the same 56px size; the solid colour alone marks Like as the main
// action. A soft shadow keeps the light ones from fading into the background.
const STYLES: Record<SwipeAction, { className: string; icon: keyof typeof Ionicons.glyphMap; color: string; size: number }> = {
  pass: { className: "h-14 w-14 bg-accent-50", icon: "close", color: "#C1440E", size: 26 },
  save: { className: "h-14 w-14 bg-white dark:bg-ink-800", icon: "star", color: "#D9663D", size: 22 },
  like: { className: "h-14 w-14 bg-accent-500", icon: "heart", color: "#FFFFFF", size: 24 },
};

const LABEL_KEYS: Record<SwipeAction, "discover.pass" | "discover.save" | "discover.like"> = {
  pass: "discover.pass",
  save: "discover.save",
  like: "discover.like",
};

export function SwipeButton({ action, onPress }: { action: SwipeAction; onPress: () => void }) {
  const { t } = useTranslation();
  const style = STYLES[action];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(LABEL_KEYS[action])}
      className={`items-center justify-center rounded-full ${style.className}`}
      style={{
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
      onPress={onPress}
    >
      <Ionicons name={style.icon} size={style.size} color={style.color} />
    </Pressable>
  );
}
