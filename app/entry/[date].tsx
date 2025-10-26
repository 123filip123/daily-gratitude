import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getEntryByDate, GratitudeEntry, initDatabase } from "@/lib/database";
import { parseDBToDisplayFormat } from "@/lib/date-helpers";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";

export default function EntryDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [entry, setEntry] = useState<GratitudeEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEntry = useCallback(async () => {
    if (!date) return;

    try {
      await initDatabase();
      const foundEntry = await getEntryByDate(date);
      setEntry(foundEntry);
    } catch (error) {
      console.error("Error loading entry:", error);
      Alert.alert("Error", "Failed to load entry");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Entry" }} />
        <ThemedView style={styles.container}>
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      </>
    );
  }

  if (!entry) {
    return (
      <>
        <Stack.Screen options={{ title: "Entry" }} />
        <ThemedView style={styles.container}>
          <ThemedText>Entry not found</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Entry",
          headerBackTitle: "Back",
        }}
      />
      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            {parseDBToDisplayFormat(entry.date)}
          </ThemedText>

          <ThemedView style={styles.contentContainer}>
            <ThemedText style={styles.content}>{entry.content}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </>
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
    marginTop: 20,
    marginBottom: 20,
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
});
