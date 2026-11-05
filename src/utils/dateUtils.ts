import { Timestamp } from 'firebase/firestore';

/**
 * Converts various date formats (ISO string, JS Date, Firestore Timestamp) 
 * into a standard JS Date object.
 */
export function toJSDate(date: any): Date {
  if (!date) return new Date();
  
  // Firestore Timestamp
  if (date instanceof Timestamp) {
    return date.toDate();
  }
  
  // Firestore-like object {seconds, nanoseconds} (happens after project switch or plain JSON)
  if (date && typeof date === 'object' && 'seconds' in date) {
    return new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
  }
  
  // Date object
  if (date instanceof Date) {
    return date;
  }
  
  // ISO String or other date string
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    console.error('Error parsing date:', date, e);
  }
  
  return new Date();
}

/**
 * Formats a date for display in Indonesian format.
 */
export function formatDisplayDate(date: any, options: Intl.DateTimeFormatOptions = { 
  day: 'numeric', 
  month: 'short', 
  hour: '2-digit', 
  minute: '2-digit' 
}): string {
  try {
    const d = toJSDate(date);
    return d.toLocaleDateString('id-ID', options);
  } catch (e) {
    return String(date);
  }
}

/**
 * Formats a date to ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: any): string {
  const d = toJSDate(date);
  return d.toISOString().split('T')[0];
}
