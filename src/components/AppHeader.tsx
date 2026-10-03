import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import { AppMark } from "@/components/AppMark";
import { HeaderAvatar } from "@/components/HeaderAvatar";

const ICON_HEIGHT = 34;
// AppMark's two circles span only 104 of its 160-unit viewBox vertically, so it
// has to be drawn larger for the visible logo to match the avatar's height.
const APP_MARK_SIZE = Math.round((ICON_HEIGHT * 160) / 104);
// ...and its left circle starts 10 units in, so pull it left to line up with the
// header's padding the same way the avatar does on the right.
const APP_MARK_INSET = Math.round((APP_MARK_SIZE * 10) / 160);
export const HEADER_ICON_HEIGHT = ICON_HEIGHT;

// Custom rather than react-navigation's built-in header: native-stack doesn't
// let you set the built-in header's height on every platform, and it came out
// taller than this compact logo + avatar bar needs. Same surface color as the tab
// bar (see (app)/_layout.tsx) unless a screen passes its own background class.
// Detail screens can replace the logo with their own left side (e.g. a back
// button and title), keeping the same height, shadow and avatar.
export function AppHeader({ left, bgClassName }: { left?: ReactNode; bgClassName?: string }) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  return (
    <View
      className={bgClassName}
      style={{
        paddingTop: insets.top,
        paddingBottom: 10,
        ...(bgClassName ? null : { backgroundColor: colorScheme === "dark" ? "#352C27" : "#FFFFFF" }),
        // Soft shadow along the bottom edge (same values as the chat input bar).
        // zIndex keeps it drawn over the screen content below instead of under it.
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        zIndex: 1,
      }}
    >
      <View className="h-12 flex-row items-center justify-between gap-3 px-4">
        {left ?? (
          <View style={{ marginLeft: -APP_MARK_INSET }}>
            <AppMark size={APP_MARK_SIZE} />
          </View>
        )}
        <HeaderAvatar size={ICON_HEIGHT} />
      </View>
    </View>
  );
}
