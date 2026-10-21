import i18n from "@/i18n";
import { useDialogs } from "@/stores/dialog";

// The app's alerts, drawn by DialogHost in the app's own look on every platform --
// not the system's (React Native's Alert.alert does nothing at all on the web, and the
// browser's window.alert / confirm look nothing like the app).

// A message with an OK button.
export function showAlert(title: string, message?: string) {
  void useDialogs.getState().open({
    title,
    message,
    buttons: [{ label: i18n.t("common.ok"), kind: "default", value: true }],
  });
}

// A yes / no question: resolves true when confirmed. A destructive confirm button is
// coral, otherwise teal; the backdrop, back button and Escape count as cancel.
export function confirmAlert(
  title: string,
  message: string,
  { confirmLabel, cancelLabel, destructive = false }: { confirmLabel: string; cancelLabel: string; destructive?: boolean }
): Promise<boolean> {
  return useDialogs.getState().open({
    title,
    message,
    buttons: [
      { label: cancelLabel, kind: "cancel", value: false },
      { label: confirmLabel, kind: destructive ? "destructive" : "default", value: true },
    ],
  });
}
