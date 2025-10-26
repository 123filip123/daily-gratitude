import { DB_DATE_FORMAT, DISPLAY_DATE_FORMAT } from "@/constants/date-formats";
import { format, parse } from "date-fns";

/**
 * Format date to YYYY-MM-DD for database storage
 */
export function formatDateToDBFormat(date: Date): string {
  return format(date, DB_DATE_FORMAT);
}

/**
 * Format date to display format (e.g., "Monday, January 1, 2024")
 */
export function formatDateToDisplayFormat(date: Date): string {
  return format(date, DISPLAY_DATE_FORMAT);
}

/**
 * Parse date from DB format (YYYY-MM-DD) to Date object
 */
export function parseDateFromDBFormat(date: string): Date {
  return parse(date, DB_DATE_FORMAT, new Date());
}

/**
 * Parse date from DB format (YYYY-MM-DD) to display format (e.g., "Monday, January 1, 2024")
 */
export const parseDBToDisplayFormat = (dateStr: string) => {
  const date = parseDateFromDBFormat(dateStr);
  return formatDateToDisplayFormat(date);
};
