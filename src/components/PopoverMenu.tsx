import { useEffect, useEffectEvent, useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { Modal, Pressable, View, useWindowDimensions, type ViewInstance } from "react-native";
import { useIsFocused } from "expo-router";

// A ⋯ menu's dropdown, under its button (anchorRef), in a see-through overlay: a tap
// anywhere else closes it, as do Android's back button and leaving the screen. Drawn
// inside the screen, it stayed open over taps elsewhere (they never reached it) and
// was still open on coming back from another screen.
export function PopoverMenu({
  open,
  onClose,
  anchorRef,
  width,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<ViewInstance | null>;
  width: number;
  children: ReactNode;
}) {
  const window = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    anchorRef.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, width: w, height: h }));
  }, [open, anchorRef, window.width, window.height]);

  // Leaving the screen (opening an event, a profile) closes it. An effect event: an
  // inline onClose is new every render, which as a dependency would close it at once.
  const close = useEffectEvent(onClose);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) close();
  }, [focused]);

  if (!open || !anchor) return null;

  // Right-aligned with the button, 8 below it; kept on screen.
  const right = Math.max(8, window.width - (anchor.x + anchor.width));
  return (
    // statusBarTranslucent: the overlay starts at the top of the window, like the
    // measurement (the app draws under the status bar), so the menu lands under its button.
    <Modal transparent visible onRequestClose={onClose} animationType="none" statusBarTranslucent>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="" accessible={false}>
        <View
          // Taps on the menu itself stay with the menu.
          onStartShouldSetResponder={() => true}
          className="absolute overflow-hidden rounded-2xl bg-white dark:bg-ink-800"
          style={{
            top: anchor.y + anchor.height + 8,
            right,
            width,
            boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.12)",
          }}
        >
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}
