import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getEntryByDate, initDatabase, saveEntry } from "@/lib/database";
import {
  formatDateToDBFormat,
  formatDateToDisplayFormat,
} from "@/lib/date-helpers";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function TodayScreen() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const todayDB = formatDateToDBFormat(new Date());

  // Theme colors for the text input
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({ light: "#ccc", dark: "#444" }, "text");
  const placeholderColor = useThemeColor(
    { light: "#999", dark: "#666" },
    "text"
  );

  const loadTodayEntry = useCallback(async () => {
    try {
      setLoading(true);
      await initDatabase();
      const entry = await getEntryByDate(todayDB);
      if (entry) {
        setContent(entry.content);
        // Reset editing state when loading existing entry
        setIsEditing(false);
      } else {
        // Clear content if no entry exists (e.g., after deletion)
        setContent("");
        // Show input field for new entry
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Error loading entry:", error);
      Alert.alert("Error", "Failed to load today's entry");
    } finally {
      setLoading(false);
    }
  }, [todayDB]);

  // Reload data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTodayEntry();
    }, [loadTodayEntry])
  );

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert("Error", "Please enter what you are grateful for");
      return;
    }

    setSaving(true);
    try {
      await saveEntry(todayDB, content.trim());
      Alert.alert("Success", "Your gratitude has been saved!");
      // Return to read-only mode after successful save
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Error", "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setOriginalContent(content);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setContent(originalContent);
    setIsEditing(false);
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
          Today
        </ThemedText>
        <ThemedText style={styles.date}>
          {formatDateToDisplayFormat(new Date())}
        </ThemedText>

        {content && !isEditing ? (
          // Read-only display (matches calendar screen style)
          <ThemedView style={styles.entryContainer}>
            <ThemedView style={styles.entryHeader}>
              <ThemedText style={styles.whatYouAreGratefulFor}>
                What you&apos;re grateful for today:
              </ThemedText>

              <TouchableOpacity onPress={handleEdit}>
                <ThemedText style={styles.editButtonText}>Edit</ThemedText>
              </TouchableOpacity>
            </ThemedView>
            <ThemedView style={styles.contentContainer}>
              <ThemedText style={styles.content}>{content}</ThemedText>
            </ThemedView>
          </ThemedView>
        ) : (
          // Edit mode
          <>
            <ThemedText style={styles.prompt}>
              What are you grateful for today?
            </ThemedText>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    color: textColor,
                  },
                ]}
                multiline
                numberOfLines={8}
                value={content}
                onChangeText={setContent}
                placeholder="Write your gratitude here..."
                placeholderTextColor={placeholderColor}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <ThemedText style={styles.buttonText}>
                  {saving ? "Saving..." : "Save"}
                </ThemedText>
              </TouchableOpacity>

              {originalContent && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <ThemedText style={styles.cancelButtonText}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
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
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    marginBottom: 30,
    opacity: 0.7,
  },
  whatYouAreGratefulFor: {
    fontSize: 18,
  },
  prompt: {
    fontSize: 18,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 150,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  entryContainer: {
    marginTop: 24,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  contentContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonContainer: {
    gap: 12,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "transparent",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
