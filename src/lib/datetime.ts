const INDIA_TIME_ZONE = "Asia/Kolkata";
const INDIA_OFFSET_MINUTES = 330;

const pad2 = (value: number) => String(value).padStart(2, "0");

const getZonedParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    year: Number(valueFor("year")),
    month: Number(valueFor("month")),
    day: Number(valueFor("day")),
    hour: Number(valueFor("hour")),
    minute: Number(valueFor("minute")),
  };
};

export const getIndiaDateIso = (date = new Date()) => {
  const { year, month, day } = getZonedParts(date, INDIA_TIME_ZONE);
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

export const shiftIsoDate = (isoDate: string, dayDelta: number) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayDelta));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
};

export const getIndiaDateDaysAgoIso = (daysAgo: number) => shiftIsoDate(getIndiaDateIso(), -daysAgo);

export const formatIsoDateDdMmYyyy = (isoDate: string | null | undefined) => {
  if (!isoDate) return "-";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

export const formatIndiaDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatIsoDateDdMmYyyy(value);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const formatIndiaDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(" am", " AM")
    .replace(" pm", " PM");
};

export const formatIndiaTime = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(" am", " AM")
    .replace(" pm", " PM");
};

export const getIndiaDayStartUtcIso = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - INDIA_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs).toISOString();
};
