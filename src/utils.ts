import type { PlaceholderValues } from "./types";

/**
 * Get nested object value from dot notation path
 * @param obj - Object to search
 * @param path - Dot notation path (e.g., "profile.name")
 * @returns Found string, or undefined
 */
export function getNestedValue(
  obj: Record<string, any>,
  path: string
): string | undefined {
  const keys = path.split(".");
  let current: any = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Replace placeholders in message with values
 * Placeholder format: {name}
 * @param message - String containing placeholders
 * @param values - Object with replacement values
 * @returns String after replacement
 */
export function replacePlaceholders(
  message: string,
  values: PlaceholderValues
): string {
  let result = message;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{${key}}`;
    result = result.replaceAll(placeholder, String(value));
  }
  return result;
}
