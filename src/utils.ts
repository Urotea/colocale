import { InvalidPlaceholderError } from "./errors";
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
 * Extract all placeholder names from a message string
 * @param message - String containing placeholders
 * @returns Array of placeholder names
 * @internal
 */
export function extractPlaceholders(message: string): string[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders: string[] = [];

  for (const match of message.matchAll(placeholderRegex)) {
    placeholders.push(match[1]);
  }

  return placeholders;
}

/**
 * Replace placeholders in message with values
 * Placeholder format: {{name}}
 * @param message - String containing placeholders
 * @param values - Object with replacement values
 * @returns String after replacement
 * @throws Error if required placeholders are missing from values
 * @internal
 */
export function replacePlaceholders(
  message: string,
  values: PlaceholderValues
): string {
  // Extract all placeholders from the message
  const requiredPlaceholders = extractPlaceholders(message);

  // Check if all required placeholders are provided
  const missingPlaceholders = requiredPlaceholders.filter(
    (placeholder) => !(placeholder in values)
  );

  if (missingPlaceholders.length > 0) {
    throw new InvalidPlaceholderError(missingPlaceholders, message);
  }

  // Replace placeholders with values
  let result = message;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, String(value));
  }
  return result;
}
