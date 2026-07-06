import type { Messages } from "./locales";

type Primitive = string | readonly string[];

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] != null ? String(params[key]) : `{${key}}`,
  );
}

export function translate(
  messages: Messages,
  key: string,
  params?: Record<string, string | number>,
): string {
  const value = getByPath(messages, key);
  if (typeof value === "string") return interpolate(value, params);
  if (Array.isArray(value)) return value.join(", ");
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
  return interpolate(messages.dates.studyDateFormat, {
    day: messages.dates.daysFull[d.getDay()],
    monthShort: messages.dates.monthsShort[d.getMonth()],
    year: d.getFullYear(),
  });
}

export type MessageKey = string;
