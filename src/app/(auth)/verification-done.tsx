import { Linking, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Button } from "@/components/Button";

// Where Stripe Identity sends a member from the phone app when they finish:
// joinhalka.com/verification-done, the website, shown in the app's in-app browser.
// It tells them to close it; the button opens the app's Verification screen through
// the app's link prefix, where the result shows.
export default function VerificationDone() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-5 bg-primary-50 px-8 dark:bg-ink-950">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-teal-50">
        <Ionicons name="shield-checkmark-outline" size={32} color="#206E65" />
      </View>
      <Text className="text-center font-display text-2xl text-ink-900 dark:text-ink-50">
        {t("settings.verificationScreen.doneTitle")}
      </Text>
      <Text className="max-w-[340px] text-center text-base text-ink-700 dark:text-ink-200">
        {t("settings.verificationScreen.doneBody")}
      </Text>
      <View className="w-full max-w-[340px]">
        <Button
          label={t("settings.verificationScreen.doneButton")}
          onPress={() => Linking.openURL("turek://settings/verification").catch(() => {})}
        />
      </View>
    </SafeAreaView>
  );
}
