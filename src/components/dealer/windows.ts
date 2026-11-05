import type { CheckInWindow } from "@/lib/types";

const HOUR = 3600_000;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function at(base: Date, dayOffset: number, hour: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function dayWord(dayOffset: number, date: Date): string {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  return DAY_NAMES[date.getDay()];
}

const part = (h: number) => (h < 12 ? "morning" : h < 14 ? "midday" : "afternoon");

/**
 * Check-in windows the dealer can pick from: "Right now" plus about six two-hour slots over
 * the next three days, in local time. Past slots and Sundays are left out.
 */
export function makeWindows(now = new Date()): CheckInWindow[] {
  const out: CheckInWindow[] = [
    { id: `now-${now.getTime()}`, label: "Right now", start: now.toISOString(), end: new Date(now.getTime() + 2 * HOUR).toISOString() },
  ];
  const push = (dayOffset: number, h: number, withPart: boolean) => {
    const start = at(now, dayOffset, h);
    if (start.getTime() <= now.getTime() + 30 * 60_000 || start.getDay() === 0) return;
    const day = dayWord(dayOffset, start);
    out.push({
      id: `w-${start.toISOString()}`,
      label: `${day}${withPart ? ` ${part(h)}` : ""} ${h}–${h + 2}`,
      start: start.toISOString(),
      end: new Date(start.getTime() + 2 * HOUR).toISOString(),
    });
  };
  // Later today: up to two of the remaining slots.
  const before = out.length;
  for (const h of [10, 12, 14, 16]) if (out.length - before < 2) push(0, h, false);
  // Following days: a morning and an afternoon slot each.
  for (let day = 1; day <= 3 && out.length < 7; day++) {
    push(day, 8, true);
    if (out.length < 7) push(day, 14, true);
  }
  return out;
}

/** "Today 14–16" reads well after "Booked for"; "Right now" becomes "right now". */
export const bookedLabel = (w: CheckInWindow) => (w.label === "Right now" ? "right now" : w.label);
