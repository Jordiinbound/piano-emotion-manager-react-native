import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, View, Text } from "react-native";

// Importar estilos globales para web
if (Platform.OS === 'web') {
  require('../app.css');
}
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/manus-runtime";
import { SnackbarProvider } from "@/components/snackbar";
import { LanguageProvider } from "@/contexts/language-context";
import { DistributorProvider } from "@/contexts/distributor-context";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { AuthGuard } from "@/components/auth-guard";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { ClerkProvider } from "@/components/clerk-provider";
import { ClerkTokenProvider } from "@/lib/clerk-token-provider";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(drawer)",
};

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [fontsLoaded, fontError] = useFonts({
    'Arkhip': require('@/assets/fonts/Arkhip.otf'),
    'Montserrat-Regular': require('@/assets/fonts/Montserrat-Regular.otf'),
    'Montserrat-SemiBold': require('@/assets/fonts/Montserrat-SemiBold.otf'),
    'Montserrat-Bold': require('@/assets/fonts/Montserrat-Bold.otf'),
  });

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Ocultar splash cuando las fuentes estén cargadas o haya error
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    try {
      initManusRuntime();
    } catch (e) {
    }
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
      return () => unsubscribe();
    } catch (e) {
    }
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(
    () => initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame },
    [initialFrame, initialInsets],
  );

  // Mostrar error si hay problema con las fuentes
  if (fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: 'red' }}>Error loading fonts: {fontError.message}</Text>
      </View>
    );
  }

  // No renderizar hasta que esté listo
  if (!appReady) {
    return null;
  }

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider>
        <ClerkTokenProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
              <DistributorProvider>
                <SubscriptionProvider>
                  <LanguageProvider>
                    <SnackbarProvider>
                    <AuthGuard>
                    <OnboardingGuard>
                    <Stack
                      screenOptions={{
                        headerTitleStyle: {
                          fontFamily: 'Arkhip',
                        },
                      }}
                    >
                      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                      <Stack.Screen name="(app)" options={{ headerShown: false }} />
                      <Stack.Screen name="settings" options={{ title: 'Configuración', headerShown: false }} />
                      <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
                      <Stack.Screen name="login" options={{ headerShown: false }} />
                      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
                      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                      <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
                      <Stack.Screen name="portal" options={{ title: 'Portal del Cliente', headerShown: false }} />

                      <Stack.Screen name="suppliers" options={{ title: 'Proveedores', headerShown: false }} />
                      <Stack.Screen name="analytics" options={{ title: 'Análisis', headerShown: false }} />
                      <Stack.Screen name="accounting" options={{ title: 'Contabilidad', headerShown: false }} />

                      <Stack.Screen name="teams" options={{ title: 'Equipos', headerShown: false }} />
                      <Stack.Screen name="quotes" options={{ title: 'Presupuestos', headerShown: false }} />
                      <Stack.Screen name="reminders/index" options={{ title: 'Recordatorios', headerShown: false }} />

                      <Stack.Screen name="whatsapp-settings" options={{ title: 'Configuración de WhatsApp', headerShown: false }} />
                      <Stack.Screen name="payment-settings" options={{ title: 'Configuración de Pagos', headerShown: false }} />
                      <Stack.Screen name="dashboard-editor" options={{ title: 'Editor de Panel', headerShown: false }} />
                      <Stack.Screen name="predictions" options={{ title: 'Predicciones', headerShown: false }} />
                      <Stack.Screen name="service-catalog" options={{ title: 'Catálogo de Servicios', headerShown: false }} />
                      <Stack.Screen name="service-categories" options={{ title: 'Categorías de Servicios', headerShown: false }} />
                      <Stack.Screen name="admin" options={{ title: 'Administración', headerShown: false }} />
                      <Stack.Screen name="alerts" options={{ title: 'Alertas', headerShown: false }} />
                    </Stack>
                    <AIAssistant />
                    </OnboardingGuard>
                    </AuthGuard>
                    <StatusBar style="auto" />
                    </SnackbarProvider>
                  </LanguageProvider>
                </SubscriptionProvider>
              </DistributorProvider>
            </ThemeProvider>
          </QueryClientProvider>
          </trpc.Provider>
        </ClerkTokenProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <SafeAreaFrameContext.Provider value={frame}>
          <SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
      </SafeAreaProvider>
    );
  }

  return <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>;
}
