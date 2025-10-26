import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { getNotificationSettings, initDatabase } from "@/lib/database";
import {
  requestNotificationPermissions,
  scheduleGratitudeNotification,
  setupNotificationHandler,
} from "@/lib/notifications";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    // Setup notification handler
    setupNotificationHandler();

    // Initialize notifications
    const initNotifications = async () => {
      try {
        await initDatabase();
        const settings = await getNotificationSettings();

        if (settings.enabled) {
          const hasPermission = await requestNotificationPermissions();
          if (hasPermission) {
            await scheduleGratitudeNotification(settings.hour, settings.minute);
          }
        }
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initNotifications();

    // Handle notification response (when user taps on notification)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const screen = response.notification.request.content.data.screen;
        if (screen === "(tabs)") {
          router.push("/(tabs)");
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="entry/[date]"
          options={{ presentation: "card", title: "Entry" }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
