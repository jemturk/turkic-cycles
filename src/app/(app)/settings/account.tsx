import { useState } from "react";
import { Platform } from "react-native";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import { supabase } from "@/api/client";
import { useSession } from "@/hooks/useSession";
import { passwordComplexitySchema } from "@/schemas/auth";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { SubPage, Card, Group, Item } from "@/components/SettingsUI";
import { showAlert } from "@/lib/alert";

export default function Account() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onChangePassword() {
    const result = passwordComplexitySchema.safeParse(newPassword);
    if (!result.success) {
      setStatus(result.error.issues[0].message);
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSaving(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setNewPassword("");
    setStatus(t("settings.accountScreen.passwordUpdated"));
    // Alert.alert is a no-op on web; this confirmation also shows inline above.
    if (Platform.OS !== "web") showAlert(t("settings.accountScreen.passwordUpdated"));
  }

  return (
    <SubPage title={t("settings.accountScreen.heading")} form>
      <Group>
        <Item icon="mail-outline" title={t("settings.accountScreen.email")} subtitle={session?.user.email} />
        <Item
          icon="call-outline"
          title={t("settings.accountScreen.phone")}
          subtitle={t("settings.accountScreen.notAvailableYet")}
        />
        <Item
          icon="link-outline"
          title={t("settings.accountScreen.linkedAccounts")}
          subtitle={t("settings.accountScreen.notAvailableYet")}
        />
      </Group>
      <Card>
        <TextField
          label={t("settings.accountScreen.newPassword")}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <Text className="-mt-2 text-xs text-ink-400 dark:text-ink-300">{t("auth.signUp.passwordHint")}</Text>
        {status ? <Text className="text-sm text-ink-700 dark:text-ink-200">{status}</Text> : null}
        <Button
          label={isSaving ? t("common.saving") : t("settings.accountScreen.changePassword")}
          disabled={isSaving}
          onPress={onChangePassword}
        />
      </Card>
    </SubPage>
  );
}
