import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  deleteAllEntries,
  getAllEntries,
  getNotificationSettings,
  initDatabase,
  saveEntry,
  saveNotificationSettings,
} from "@/lib/database";
import {
  cancelAllNotifications,
  requestNotificationPermissions,
  scheduleGratitudeNotification,
} from "@/lib/notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
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

export default function SettingsScreen() {
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

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
      setHasPermission(granted);

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

  const handleExportData = async () => {
    try {
      // Get all entries from database
      const entries = await getAllEntries();

      if (entries.length === 0) {
        Alert.alert("No Data", "There are no gratitude entries to export.");
        return;
      }

      // Convert to CSV format
      const csvHeader = "date,content,created_at,updated_at\n";
      const csvRows = entries.map((entry) => {
        // Escape content for CSV (handle quotes and newlines)
        const escapedContent = entry.content
          .replace(/"/g, '""')
          .replace(/\n/g, "\\n");
        return `"${entry.date}","${escapedContent}","${entry.created_at}","${entry.updated_at}"`;
      });
      const csvContent = csvHeader + csvRows.join("\n");

      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `gratitude-export-${timestamp}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;

      // Write file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert(
          "Export Complete",
          `Data exported to ${filename}, but sharing is not available on this device.`
        );
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      Alert.alert("Error", "Failed to export data. Please try again.");
    }
  };

  const handleImportData = async () => {
    try {
      // Pick a CSV file
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(
        result.assets[0].uri
      );

      // Parse CSV
      const lines = fileContent.split("\n");
      if (lines.length < 2) {
        Alert.alert("Invalid File", "The CSV file appears to be empty.");
        return;
      }

      // Skip header and parse entries
      let importedCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Parse CSV line (handles quoted fields)
          const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
          if (!matches || matches.length < 4) {
            errorCount++;
            continue;
          }

          // Extract and clean values
          const cleanValue = (str: string) => {
            let cleaned = str.replace(/^,?"?|"?$/g, "");
            cleaned = cleaned.replace(/""/g, '"');
            cleaned = cleaned.replace(/\\n/g, "\n");
            return cleaned;
          };

          const date = cleanValue(matches[0]);
          const content = cleanValue(matches[1]);

          // Validate date format (YYYY-MM-DD)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            errorCount++;
            continue;
          }

          // Save entry (overwrites existing)
          await saveEntry(date, content);
          importedCount++;
        } catch (err) {
          errorCount++;
          console.error(`Error importing line ${i}:`, err);
        }
      }

      if (importedCount > 0) {
        Alert.alert(
          "Import Complete",
          `Successfully imported ${importedCount} entries.${
            errorCount > 0 ? ` ${errorCount} entries failed to import.` : ""
          }`
        );
      } else {
        Alert.alert("Import Failed", "No valid entries found in the CSV file.");
      }
    } catch (error) {
      console.error("Error importing data:", error);
      Alert.alert("Error", "Failed to import data. Please try again.");
    }
  };

  const handleDeleteData = () => {
    Alert.alert(
      "Delete All Data",
      "Are you sure you want to delete all gratitude entries? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllEntries();
              Alert.alert(
                "Success",
                "All gratitude entries have been deleted."
              );
            } catch (error) {
              console.error("Error deleting data:", error);
              Alert.alert("Error", "Failed to delete data. Please try again.");
            }
          },
        },
      ]
    );
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
          Settings
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Notifications
          </ThemedText>

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
                  {Platform.OS === "ios" && (
                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <ThemedText style={styles.doneButtonText}>
                        Done
                      </ThemedText>
                    </TouchableOpacity>
                  )}
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

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Data Management
          </ThemedText>

          <TouchableOpacity
            style={styles.dataButton}
            onPress={handleExportData}
          >
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>Export Data</ThemedText>
              <ThemedText style={styles.settingDescription}>
                Export all gratitude entries to CSV
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dataButton}
            onPress={handleImportData}
          >
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>Import Data</ThemedText>
              <ThemedText style={styles.settingDescription}>
                Import gratitude entries from CSV
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dataButton, styles.deleteButton]}
            onPress={handleDeleteData}
          >
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>
                Delete All Data
              </ThemedText>
              <ThemedText style={styles.settingDescription}>
                Permanently delete all gratitude entries
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
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
  sectionTitle: {
    marginBottom: 16,
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
  doneButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
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
  dataButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
});
