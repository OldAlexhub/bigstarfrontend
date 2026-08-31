export const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export const startOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const utcMidnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - day);
  return utcMidnight;
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

export const toISODate = (date) => new Date(date).toISOString().slice(0, 10);

// Every division operates in a real US timezone — reading "today" off raw
// UTC calendar fields makes the app show tomorrow's date starting in the
// afternoon/evening, division-local. This computes the calendar day it
// currently is in a SPECIFIC division's timezone (DST-aware via Intl, no
// dependency needed), returned as the same UTC-midnight Date shape every
// other date helper here already expects.
export const DEFAULT_TIMEZONE = "America/New_York";

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export const todayInTimezone = (timezone = DEFAULT_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day"))));
};

export const formatShortDate = (date) =>
  new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
