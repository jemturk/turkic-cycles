import { Linking, Platform, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Button } from "@/components/Button";

// The account emails link to the website (joinhalka.com/confirm, /reset-password) with
// the one-time code in the link, so mail apps and their link scanners only load a page:
// the code is used up when the page calls verifyOtp, not when the link is opened.
// When the email was asked for from the phone app, its redirect_to is the app's own
// turek:// link; the page then offers to pass the code on to the app rather than use it
// in the browser.
export function isFromApp(redirectTo: string | undefined): boolean {
  return Platform.OS === "web" && !!redirectTo?.startsWith("turek://");
}

type AppHandoffProps = {
  path: "confirm" | "reset-password";
  tokenHash: string;
  type: string;
  onContinueInBrowser: () => void;
};

export function AppHandoff({ path, tokenHash, type, onContinueInBrowser }: AppHandoffProps) {
  const { t } = useTranslation();
  const appLink = `turek://${path}?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
  return (
    <View className="flex-1 items-center justify-center gap-5 px-8">
      <Text className="text-center font-display text-2xl text-ink-900 dark:text-ink-50">
        {t("auth.appHandoff.title")}
      </Text>
      <Text className="max-w-[340px] text-center text-base text-ink-700 dark:text-ink-200">
        {t("auth.appHandoff.body")}
      </Text>
      <View className="w-full max-w-[340px] gap-3">
        <Button label={t("auth.appHandoff.open")} onPress={() => Linking.openURL(appLink).catch(() => {})} />
        <Button variant="secondary" label={t("auth.appHandoff.browser")} onPress={onContinueInBrowser} />
      </View>
    </View>
  );
}
