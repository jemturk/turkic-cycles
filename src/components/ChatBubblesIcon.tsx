import Svg, { G, Path } from "react-native-svg";

// Ionicons' "chatbubbles-outline", exactly -- its outlines taken from the icon font
// (glyph U+F218, 512 units to the em, y up) -- with the bubble in front in teal and
// the one behind it in the coral accent, which a one-color font glyph can't do.
const FRONT_BUBBLE =
  "M265 414Q274 415 293.5 415.0Q313 415 322 413Q350 409 376 396Q413 378 439.0 346.5Q465 315 475 276Q493 202 453 138L447 130L455 100Q462 75 463.0 68.5Q464 62 461 56Q456 46 447 44Q439 41 403 54L370 66L355 61Q297 42 249 52Q205 61 170 89Q154 101 141 117Q115 149 106 189Q95 234 106 276Q119 327 158 363Q202 405 265 414Z" +
  "M315 382Q287 386 260 381Q213 372 179.0 340.0Q145 308 136 264Q123 205 154 154Q176 120 210.5 100.0Q245 80 285 80Q310 80 345 92Q361 97 370 97H379L403 88Q427 80 427.5 80.0Q428 80 421.5 101.5Q415 123 415 128Q414 137 424 153Q444 184 447 220Q453 278 414.5 325.5Q376 373 315 382Z";
const BACK_BUBBLE =
  "M61 231Q61 231 61 231Q69 234 75.5 229.0Q82 224 82 216Q82 212 78 203Q57 160 68 113Q73 94 85 74Q90 66 91 61Q91 61 92 56L88 31Q83 6 83.0 5.5Q83 5 105.0 13.5Q127 22 132 23Q139 24 155 19Q181 11 205 11Q239 11 271 27Q283 33 290.0 30.0Q297 27 300 20Q302 11 295 4Q289 -1 271.5 -8.0Q254 -15 240 -18Q194 -27 146 -11Q146 -11 137 -8L108 -20Q80 -31 76 -31Q63 -34 54 -23Q48 -16 48 -8Q48 -6 54 24Q54 24 60 54L56 60Q38 89 33 124Q30 146 34 168Q38 197 50 220Q55 229 61 231Z";

export function ChatBubblesIcon({
  size,
  frontColor = "#3E9BA7",
  backColor = "#C1440E",
}: {
  size: number;
  frontColor?: string;
  backColor?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" accessibilityElementsHidden>
      {/* Font coordinates run upward from the baseline; flip them into SVG's. */}
      <G transform="translate(0 448) scale(1 -1)">
        <Path d={FRONT_BUBBLE} fill={frontColor} />
        <Path d={BACK_BUBBLE} fill={backColor} />
      </G>
    </Svg>
  );
}
