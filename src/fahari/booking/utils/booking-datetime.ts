export function calendarDateFromIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function timeOfDayFromHoursMinutes(hoursMinutes: string): Date {
  return new Date(`1970-01-01T${hoursMinutes}:00.000Z`);
}
