export type Meridiem = "AM" | "PM";

export type DateTimeValue = {
  date: string;
  hour: string;
  minute: string;
  meridiem: Meridiem;
};

const DATE_PATTERN = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(20\d{2})$/;
const HOUR_PATTERN = /^(0?[1-9]|1[0-2])$/;
const MINUTE_PATTERN = /^[0-5][0-9]$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [dayText, monthText, yearText] = value.split("-");
  const day = Number(dayText);
  const monthIndex = Number(monthText) - 1;
  const year = Number(yearText);

  const date = new Date(year, monthIndex, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
  );
}

export function isValidDateTimeValue(value: DateTimeValue): boolean {
  return (
    isValidDateString(value.date) &&
    HOUR_PATTERN.test(value.hour) &&
    MINUTE_PATTERN.test(value.minute)
  );
}

export function normalizeDateForForm(value: string): string[] {
  const [day, month, year] = value.split("-");
  return [
    `${day}-${month}-${year}`,
    `${day}/${month}/${year}`,
    `${year}-${month}-${day}`
  ];
}

export function toIsoDateString(value: string): string {
  const [day, month, year] = value.split("-");
  return `${year}-${month}-${day}`;
}

export function padHour(value: string): string {
  return value.padStart(2, "0");
}

export function formatDateTimeSummary(value: DateTimeValue): string {
  return `${value.date} ${padHour(value.hour)}:${value.minute} ${value.meridiem}`;
}
