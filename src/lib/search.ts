/** Removes undefined/empty values so URL search objects satisfy exactOptionalPropertyTypes. */
export function cleanSearch<T>(input: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out as T;
}
