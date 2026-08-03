import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LoadingPlaceholder } from "@/components/LoadingPlaceholder";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { ensureApiClientConfigured } from "@/lib/configureApiClient";
import { defaultTheme } from "@/theme/buildTheme";
import { ThemeProvider } from "@/theme/ThemeProvider";

ensureApiClientConfigured();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export { ErrorBoundary } from "expo-router";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === "login";
    if (!user && !onLogin) {
      router.replace("/login");
    } else if (user && onLogin) {
      router.replace("/");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.boot}>
        <LoadingPlaceholder padding="md" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <AuthGate>
                  <DismissKeyboardView style={{ flex: 1 }}>
                    <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen name="progress" />
                    <Stack.Screen name="words" />
                    <Stack.Screen name="pronunciation" />
                    <Stack.Screen name="meaning" />
                    <Stack.Screen name="study" />
                    </Stack>
                  </DismissKeyboardView>
                </AuthGate>
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: defaultTheme.appBg,
  },
});
