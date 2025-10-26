import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  deleteAllEntries,
  getAllEntries,
  initDatabase,
  saveEntry,
} from "@/lib/database";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function DataManagementScreen() {
  useEffect(() => {
    initDatabase();
  }, []);

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

  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Data Management
        </ThemedText>

        <View style={styles.section}>
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
