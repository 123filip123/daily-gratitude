import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path as any);
  };

  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Settings
        </ThemedText>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => handleNavigate("/settings/notifications")}
          >
            <View style={styles.settingContent}>
              <IconSymbol name="bell" size={24} color="#007AFF" />
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>
                  Notifications
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Configure daily reminders
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => handleNavigate("/settings/data-management")}
          >
            <View style={styles.settingContent}>
              <IconSymbol name="folder" size={24} color="#007AFF" />
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>
                  Data Management
                </ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Export, import, or delete your data
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.forward" size={20} color="#999" />
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
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "rgba(0, 122, 255, 0.05)",
    borderRadius: 8,
    marginBottom: 12,
  },
  settingContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingInfo: {
    flex: 1,
    marginLeft: 16,
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
});
