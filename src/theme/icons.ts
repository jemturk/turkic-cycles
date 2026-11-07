import { Platform } from "react-native";
import { cssInterop } from "nativewind";
import { Ionicons } from "@expo/vector-icons";

// Ionicons takes a `color` prop, not `style`/`className` -- this teaches NativeWind
// to resolve a className (including dark: variants) into that prop, the same way
// every View/Text in this app already gets dark-mode-aware colors via className.
// On web NativeWind can't resolve a class to a value (it's real CSS there), and
// nativeStyleToProp dropped the class, so those icons drew in the default black; there
// the class goes onto the icon's Text as a style instead, where the CSS colour applies.
// Side-effect import only; do this once, before any Ionicons renders.
cssInterop(
  Ionicons,
  Platform.OS === "web"
    ? { className: "style" }
    : {
        className: {
          target: false,
          nativeStyleToProp: { color: "color" },
        },
      }
);
