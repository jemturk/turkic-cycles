// The raised card: white on the cream page with 22px corners (rounded-[22px]) and this
// soft, warm shadow, so cards lift off the page rather than sitting flat on it. Used by
// the welcome slides and every top-level card in the app; chips, buttons, bubbles and
// cards inside cards stay flat. One boxShadow draws the same on iOS, Android and web
// (Android's elevation drew a darker band under the bottom edge instead).
export const CARD_SHADOW = { boxShadow: "0px 4px 16px rgba(43, 35, 32, 0.09)" } as const;

// A bar floating over content that scrolls beneath it (the chat message box, the
// Connections tab strip): a little stronger than a card, so it reads as above the list.
export const FLOATING_SHADOW = { boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.16)" } as const;
