import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// How far the next person's card peeks out below the current one (DiscoverDeck).
export const DECK_PEEK = 10;

// Everything on the Discover tab that isn't the card, top to bottom (keep in step
// with AppHeader, discover/index.tsx and DiscoverDeck): AppHeader's row (44) and
// bottom padding (6), the card's top margin (12), the next card peeking out under it
// (DECK_PEEK), the buttons' top margin (16) and row (56), the screen's bottom
// padding (16), and the tab bar (60). AppHeader's top padding is added separately:
// the status bar inset, or 6 when there is none.
const NON_CARD_HEIGHT = 50 + 12 + DECK_PEEK + 16 + 56 + 16 + 60;
const HEADER_TOP_PADDING_WITHOUT_INSET = 6;
const SIDE_PADDING = 16 * 2;
// The app is a phone-width column on wide screens (root _layout.tsx).
const MAX_APP_WIDTH = 480;

// The Discover card's size on this device, in points. Every card on a device is
// this size; the cover-photo preview draws the card at exactly this size too.
export function useDiscoverCardSize(): { width: number; height: number } {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = Math.min(width, MAX_APP_WIDTH) - SIDE_PADDING;
  const headerTop = insets.top > 0 ? insets.top : HEADER_TOP_PADDING_WITHOUT_INSET;
  const cardHeight = height - headerTop - insets.bottom - NON_CARD_HEIGHT;
  // Never wider than square: on very short (landscape) windows fall back to 4:5.
  if (cardHeight <= cardWidth) return { width: cardWidth, height: Math.round((cardWidth * 5) / 4) };
  return { width: Math.round(cardWidth), height: Math.round(cardHeight) };
}

// The same as a width:height pair, for cropping the photo that becomes the card's
// background. The card shows the photo scaled to fill and centre-cropped, so a
// photo cropped on one phone still fills the card on another.
export function useDiscoverCardAspect(): [number, number] {
  const { width, height } = useDiscoverCardSize();
  return [width, height];
}
