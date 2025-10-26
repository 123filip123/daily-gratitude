import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  getAllEntries,
  getEntryByDate,
  GratitudeEntry,
  initDatabase,
} from "@/lib/database";
import { parseDBToDisplayFormat } from "@/lib/date-helpers";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { Calendar, DateData } from "react-native-calendars";

export default function CalendarScreen() {
  const [markedDates, setMarkedDates] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<GratitudeEntry | null>(
    null
  );
  const colorScheme = useColorScheme();

  useEffect(() => {
    loadEntries();

    // Refresh when screen comes into focus
    const interval = setInterval(loadEntries, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadEntries = async () => {
    try {
      await initDatabase();
      const entries = await getAllEntries();

      // Mark dates that have entries
      const marked: { [key: string]: any } = {};
      entries.forEach((entry: GratitudeEntry) => {
        marked[entry.date] = {
          marked: true,
          dotColor: "#007AFF",
        };
      });

      setMarkedDates(marked);
    } catch (error) {
      console.error("Error loading entries:", error);
      Alert.alert("Error", "Failed to load entries");
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = async (day: DateData) => {
    // Only load entry if the day has an entry
    if (markedDates[day.dateString]) {
      try {
        const entry = await getEntryByDate(day.dateString);
        setSelectedEntry(entry);
      } catch (error) {
        console.error("Error loading entry:", error);
        Alert.alert("Error", "Failed to load entry");
      }
    } else {
      // Clear selection if tapping on a day without an entry
      setSelectedEntry(null);
    }
  };

  const isDark = colorScheme === "dark";

  return (
    <ScrollView style={styles.scrollView}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Calendar
        </ThemedText>

        {loading ? (
          <ThemedText>Loading...</ThemedText>
        ) : (
          <>
            <Calendar
              markedDates={{
                ...markedDates,
                ...(selectedEntry && {
                  [selectedEntry.date]: {
                    ...markedDates[selectedEntry.date],
                    selected: true,
                    selectedColor: "#007AFF",
                  },
                }),
              }}
              onDayPress={handleDayPress}
              theme={{
                backgroundColor: isDark ? "#000" : "#fff",
                calendarBackground: isDark ? "#000" : "#fff",
                textSectionTitleColor: isDark ? "#fff" : "#000",
                selectedDayBackgroundColor: "#007AFF",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#007AFF",
                dayTextColor: isDark ? "#fff" : "#2d4150",
                textDisabledColor: isDark ? "#444" : "#d9e1e8",
                dotColor: "#007AFF",
                selectedDotColor: "#ffffff",
                arrowColor: "#007AFF",
                monthTextColor: isDark ? "#fff" : "#000",
                indicatorColor: "#007AFF",
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
            />

            {selectedEntry ? (
              <ThemedView style={styles.entryContainer}>
                <ThemedText type="subtitle" style={styles.entryDate}>
                  {parseDBToDisplayFormat(selectedEntry.date)}
                </ThemedText>
                <ThemedView style={styles.contentContainer}>
                  <ThemedText style={styles.content}>
                    {selectedEntry.content}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            ) : (
              <ThemedText style={styles.hint}>
                Tap on a marked day to view your entry
              </ThemedText>
            )}
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
    marginBottom: 20,
  },
  hint: {
    marginTop: 20,
    textAlign: "center",
    opacity: 0.6,
  },
  entryContainer: {
    marginTop: 24,
  },
  entryDate: {
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
});
