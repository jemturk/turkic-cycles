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

// Custom rather than react-navigation's built-in header: native-stack doesn't
// let you set the built-in header's height on every platform, and it came out
// taller than this compact logo + avatar bar needs. Same surface color as the tab
// bar (see (app)/_layout.tsx).
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: 10,
        backgroundColor: colorScheme === "dark" ? "#352C27" : "#FFFFFF",
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
      <View className="h-12 flex-row items-center justify-between px-4">
        <View style={{ marginLeft: -APP_MARK_INSET }}>
          <AppMark size={APP_MARK_SIZE} />
        </View>
        <HeaderAvatar size={ICON_HEIGHT} />
      </View>
    </View>
  );
}
