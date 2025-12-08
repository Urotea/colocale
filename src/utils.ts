import type { PlaceholderValues } from "./types";

/**
 * Get value from flat object (no longer needs nested traversal)
 * @param obj - Object to search
 * @param key - Key (may contain dots in flat structure)
 * @returns Found string, or undefined
 * @internal
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Replace placeholders in message with values
 * Placeholder format: {{name}}
 * @param message - String containing placeholders
 * @param values - Object with replacement values
 * @returns String after replacement
 * @internal
 */
export function replacePlaceholders(
  message: string,
  values: PlaceholderValues
): string {
  let result = message;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, String(value));
  }
  return result;
}
