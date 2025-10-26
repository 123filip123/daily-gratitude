import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getEntryByDate } from "./database";
import { formatDateToDBFormat } from "./date-helpers";

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  // For Android, we need to set the notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Daily Gratitude Reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return true;
}

/**
 * Setup notification handler to define how notifications should be displayed
 * when the app is in the foreground
 * This also checks if user has already entered gratitude for today
 */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      // Check if user has already entered gratitude for today
      const hasEntry = await hasTodayEntry();

      // Only show notification if there's no entry for today
      if (hasEntry) {
        console.log("Skipping notification - entry already exists for today");
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

/**
 * Check if an entry exists for today
 */
async function hasTodayEntry(): Promise<boolean> {
  const today = formatDateToDBFormat(new Date());
  const entry = await getEntryByDate(today);
  return entry !== null;
}

/**
 * Schedule daily gratitude notification at specified time
 * The notification will only be shown if the user hasn't entered gratitude for the day
 * (checked in the notification handler)
 */
export async function scheduleGratitudeNotification(
  hour: number,
  minute: number
): Promise<void> {
  // Cancel all existing notifications first
  await cancelAllNotifications();

  // Schedule a daily repeating notification
  // The notification handler will check if today's entry exists before displaying
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily Gratitude Reminder 🙏",
      body: "Take a moment to reflect on what you're grateful for today.",
      sound: true,
      data: { screen: "(tabs)" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });

  console.log(
    `Notification scheduled for ${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`
  );
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log("All notifications cancelled");
}

/**
 * Get all scheduled notifications (useful for debugging)
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
