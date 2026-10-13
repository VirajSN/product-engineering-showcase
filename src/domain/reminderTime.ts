export type ReminderPart = "date" | "time";

export function reminderBase(value: string, now = new Date()) {
  const existing = value ? new Date(value) : null;
  if (existing && Number.isFinite(existing.getTime())) return existing;
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

/** Preserve local calendar/time components, then store the resulting instant. */
export function changeReminderPart(base: Date, selected: Date, part: ReminderPart) {
  if (!Number.isFinite(base.getTime()) || !Number.isFinite(selected.getTime()))
    throw Error("Choose a valid date and time.");
  const next = new Date(base);
  if (part === "date")
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next.toISOString();
}

export function localDateTimeValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

