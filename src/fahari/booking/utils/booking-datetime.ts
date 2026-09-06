export function calendarDateFromIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function timeOfDayFromHoursMinutes(hoursMinutes: string): Date {
  return new Date(`1970-01-01T${hoursMinutes}:00.000Z`);
}

export function isoDateFromCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function hoursMinutesFromTimeOfDay(time: Date): string {
  return time.toISOString().slice(11, 16);
}
