import { cssInterop } from "nativewind";
import { Ionicons } from "@expo/vector-icons";

// Ionicons takes a `color` prop, not `style`/`className` -- this teaches NativeWind
// to resolve a className (including dark: variants) into that prop, the same way
// every View/Text in this app already gets dark-mode-aware colors via className.
// Side-effect import only; do this once, before any Ionicons renders.
cssInterop(Ionicons, {
  className: {
    target: false,
    nativeStyleToProp: { color: "color" },
  },
});
