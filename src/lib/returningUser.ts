import AsyncStorage from "@react-native-async-storage/async-storage";

// Whether anyone has signed in on this device (or browser) before. A signed-out start
// then opens Log in rather than the intro slides, which are for people new to the app.
// On the device only; cleared when the account is deleted.
const KEY = "halka.hasSignedIn";

export function markSignedIn() {
  AsyncStorage.setItem(KEY, "1").catch(() => {});
}

export function forgetSignedIn() {
  return AsyncStorage.removeItem(KEY).catch(() => {});
}

export async function hasSignedInBefore(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}
