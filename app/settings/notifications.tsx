import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  getNotificationSettings,
  initDatabase,
  saveNotificationSettings,
} from "@/lib/database";
import {
  cancelAllNotifications,
  requestNotificationPermissions,
  scheduleGratitudeNotification,
} from "@/lib/notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

export default function NotificationsScreen() {
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      await initDatabase();
      const settings = await getNotificationSettings();
      setEnabled(settings.enabled);

      // Create a Date object with the saved time
      const savedTime = new Date();
      savedTime.setHours(settings.hour);
      savedTime.setMinutes(settings.minute);
      setTime(savedTime);
    } catch (error) {
      console.error("Error loading settings:", error);
      Alert.alert("Error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggle = async (value: boolean) => {
    setEnabled(value);

    if (value) {
      // Request permissions when enabling notifications
      const granted = await requestNotificationPermissions();

      if (!granted) {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your device settings to receive reminders."
        );
        setEnabled(false);
      }
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    // On Android, the picker closes after selection
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (selectedDate) {
      setTime(selectedDate);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const hour = time.getHours();
      const minute = time.getMinutes();

      // Save to database
      await saveNotificationSettings(enabled, hour, minute);

      // Update notifications
      if (enabled) {
        const granted = await requestNotificationPermissions();
        if (granted) {
          await scheduleGratitudeNotification(hour, minute);
          Alert.alert(
            "Success",
            `Notifications enabled! You'll receive a reminder at ${hour
              .toString()
              .padStart(2, "0")}:${minute
              .toString()
              .padStart(2, "0")} every day.`
          );
        } else {
          Alert.alert(
            "Permission Required",
            "Notification permissions are required to enable reminders."
          );
          setEnabled(false);
        }
      } else {
        await cancelAllNotifications();
        Alert.alert("Success", "Notifications disabled");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Notifications
        </ThemedText>

        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>
                Daily Reminder
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                Get reminded to add your daily gratitude entry
              </ThemedText>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={enabled ? "#007AFF" : "#f4f3f4"}
            />
          </View>

          {enabled && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <ThemedText style={styles.settingLabel}>
                    Reminder Time
                  </ThemedText>
                  <ThemedText style={styles.settingDescription}>
                    Choose when to receive your daily reminder
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <ThemedText style={styles.timeButtonText}>
                    {time.getHours().toString().padStart(2, "0")}:
                    {time.getMinutes().toString().padStart(2, "0")}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {(showTimePicker || Platform.OS === "ios") && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={time}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleTimeChange}
                  />
                </View>
              )}
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <ThemedText style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Settings"}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginTop: 40,
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.6,
  },
  timeButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  timeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
