import { Alert, Platform } from "react-native";

// A simple message with an OK button, on every platform. React Native's Alert.alert
// does nothing at all on the web (react-native-web has no implementation), so error
// and confirmation messages there silently vanished; the browser's own alert stands in.
// For a choice between buttons, build it in the UI instead -- window.alert has only OK.
export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
