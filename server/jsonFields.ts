export const toJson = (value: unknown): string | null =>
  value === undefined || value === null ? null : JSON.stringify(value);

export const fromJson = <T,>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};
