import { Modal, Pressable, View } from "react-native";

import { Text } from "@/components/Text";
import { useDialogs, type DialogButton } from "@/stores/dialog";

const BUTTON_STYLES: Record<DialogButton["kind"], { box: string; text: string }> = {
  cancel: {
    box: "border border-primary-100 bg-white web:hover:bg-primary-100/40 dark:border-ink-700 dark:bg-ink-700",
    text: "text-ink-900 dark:text-ink-50",
  },
  default: { box: "bg-primary-500 web:hover:bg-primary-600", text: "text-white" },
  destructive: { box: "bg-accent-500 web:hover:bg-accent-600", text: "text-white" },
};

// The app's own alert / confirm dialog, in its look rather than the system's (and
// rather than the browser's bare alert on the web). Mounted once, in the root layout;
// opened through showAlert / confirmAlert (lib/alert.ts). The backdrop, Android's
// back button and the web's Escape all mean "cancel" (or "OK" when that's the only
// choice).
export function DialogHost() {
  const dialog = useDialogs((s) => s.queue[0]);
  const close = useDialogs((s) => s.close);
  if (!dialog) return null;

  const dismissValue = dialog.buttons.find((b) => b.kind === "cancel")?.value ?? dialog.buttons[0]?.value ?? false;
  const dismiss = () => close(dialog.id, dismissValue);
  const two = dialog.buttons.length > 1;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View className="flex-1 items-center justify-center px-6">
        <Pressable
          accessible={false}
          onPress={dismiss}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(23,19,16,0.5)" }}
        />
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          aria-modal
          className="w-full max-w-[400px] gap-2 rounded-3xl bg-primary-50 p-6 dark:bg-ink-800"
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.2,
            shadowRadius: 32,
            elevation: 12,
          }}
        >
          <Text className="font-display text-xl text-ink-900 dark:text-ink-50">{dialog.title}</Text>
          {dialog.message ? (
            <Text className="text-base text-ink-700 dark:text-ink-200">{dialog.message}</Text>
          ) : null}
          <View className={`mt-4 flex-row gap-3 ${two ? "" : "justify-end"}`}>
            {dialog.buttons.map((button) => {
              const style = BUTTON_STYLES[button.kind];
              return (
                <Pressable
                  key={button.label}
                  accessibilityRole="button"
                  onPress={() => close(dialog.id, button.value)}
                  className={`h-11 items-center justify-center rounded-full px-6 ${two ? "flex-1" : "min-w-[96px]"} ${style.box}`}
                >
                  <Text className={`text-base font-semibold ${style.text}`}>{button.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
