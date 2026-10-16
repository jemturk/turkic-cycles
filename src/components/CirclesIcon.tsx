import type { ColorValue } from "react-native";
import Svg, { Circle } from "react-native-svg";

// The Circles section's icon in the desktop sidebar, where the full-colour logo
// (AppMark) already sits right above it: the logo's two overlapping circles drawn
// like the sidebar's other icons -- an outline in the tint color, filled in when
// the section is selected (the overlap reads darker, like the logo's).
export function CirclesIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Circle
        cx={9}
        cy={12}
        r={6.25}
        stroke={color}
        strokeWidth={1.6}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.55 : 0}
      />
      <Circle
        cx={15}
        cy={12}
        r={6.25}
        stroke={color}
        strokeWidth={1.6}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.55 : 0}
      />
    </Svg>
  );
}
