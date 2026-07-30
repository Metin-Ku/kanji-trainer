import type { Messages } from "./messages";

export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function translate(
  messages: Messages,
  key: string,
  params?: Record<string, string | number>,
): string {
  const value = getByPath(messages, key);
  if (typeof value === "string") return interpolate(value, params);
  return key;
}

export function formatToday(messages: Messages): string {
  const now = new Date();
  const day = messages.dates.daysFull[now.getDay()];
  const month = messages.dates.monthsFull[now.getMonth()];
  return interpolate(messages.dates.todayFormat, {
    day,
    date: now.getDate(),
    month,
    year: now.getFullYear(),
  });
}

export function formatCardDate(messages: Messages, iso: string): string {
  const d = new Date(iso);
  return interpolate(messages.dates.cardDateFormat, {
    day: d.getDate(),
    month: messages.dates.monthsFull[d.getMonth()],
    year: d.getFullYear(),
  });
}

export function formatStudyDate(messages: Messages, iso: string): string {
  const d = new Date(iso);
  const day = messages.dates.daysFull[d.getDay()];
  const month = messages.dates.monthsFull[d.getMonth()];
  return `${day}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}
