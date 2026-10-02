import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import { AppMark } from "@/components/AppMark";
import { HeaderAvatar } from "@/components/HeaderAvatar";

// Custom rather than react-navigation's built-in header: native-stack doesn't
// let you set the built-in header's height on every platform, and it came out
// taller than this compact logo + avatar bar needs. Same surface color as the tab
// bar (see (app)/_layout.tsx).
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  return (
    <View
      style={{ paddingTop: insets.top, backgroundColor: colorScheme === "dark" ? "#352C27" : "#FFFFFF" }}
    >
      <View className="h-12 flex-row items-center justify-between px-4">
        <AppMark size={50} />
        <HeaderAvatar />
      </View>
    </View>
  );
}
