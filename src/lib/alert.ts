import { Alert, Platform } from "react-native";

// A simple message with an OK button, on every platform. React Native's Alert.alert
// does nothing at all on the web (react-native-web has no implementation), so error
// and confirmation messages there silently vanished; the browser's own alert stands in.
// For a yes / no question, confirmAlert below.
export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

// A yes / no question: resolves true when confirmed. A destructive confirm button
// shows in red where the platform supports it; on the web, the browser's own confirm.
export function confirmAlert(
  title: string,
  message: string,
  { confirmLabel, cancelLabel, destructive = false }: { confirmLabel: string; cancelLabel: string; destructive?: boolean }
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
