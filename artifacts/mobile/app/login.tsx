import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthProvider";
import { useTranslation } from "@/i18n/I18nProvider";
import { getApiOrigin } from "@/lib/apiConfig";
import { useTheme } from "@/theme/ThemeProvider";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);

  const apiOrigin = getApiOrigin();

  async function onSubmit() {
    setError("");
    if (!apiOrigin) {
      setError(t("auth.apiMissing"));
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>{t("auth.loginTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.loginSubtitle")}</Text>

          {!apiOrigin ? (
            <Text style={styles.apiWarning}>{t("auth.apiMissing")}</Text>
          ) : null}

          <Text style={styles.label}>{t("auth.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            style={[
              styles.input,
              focused === "email" && styles.inputFocused,
            ]}
          />

          <Text style={[styles.label, styles.labelGap]}>{t("auth.password")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            style={[
              styles.input,
              focused === "password" && styles.inputFocused,
            ]}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              (busy || pressed) && { opacity: 0.85 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={theme.white} />
            ) : (
              <Text style={styles.buttonText}>{t("auth.login")}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.appBg,
    },
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      maxWidth: 420,
      width: "100%",
      alignSelf: "center",
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.appText,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.appTextSecondary,
      marginBottom: 24,
    },
    apiWarning: {
      fontSize: 13,
      color: theme.main600,
      backgroundColor: theme.appAccent,
      padding: 10,
      borderRadius: 8,
      marginBottom: 16,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: theme.appTextMuted,
      marginBottom: 4,
    },
    labelGap: {
      marginTop: 12,
    },
    input: {
      backgroundColor: theme.appSurface,
      borderWidth: 1,
      borderColor: theme.appBorderStrong,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.appText,
    },
    inputFocused: {
      borderColor: theme.main400,
      borderWidth: 2,
    },
    error: {
      marginTop: 12,
      fontSize: 13,
      color: theme.danger,
    },
    button: {
      marginTop: 20,
      backgroundColor: theme.main500,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    buttonText: {
      color: theme.white,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
