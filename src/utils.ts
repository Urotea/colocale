import type {
  KeysForNamespace,
  Namespace,
  PlaceholderValues,
  TranslationRequirement,
} from "./types";

/**
 * Helper function to create a TranslationRequirement with type inference
 *
 * When called without a type parameter, accepts any string for namespace and keys (backward compatible).
 * When called with a TranslationStructure type parameter, constrains namespace and keys to valid values.
 *
 * @template T - (Optional) The translation structure type (e.g., TranslationStructure)
 * @template N - The namespace type (inferred from namespace parameter)
 * @template K - Array type of translation keys (inferred from keys parameter)
 * @param namespace - Translation namespace (e.g., "common", "user", "shop")
 * @param keys - Array of translation keys
 * @returns TranslationRequirement with inferred key types
 *
 * @example
 * // Without type parameter (backward compatible)
 * const req = defineRequirement("common", ["submit", "cancel"]);
 *
 * @example
 * // With type parameter (type-safe)
 * import type { TranslationStructure } from "./messages.types";
 * const req = defineRequirement<TranslationStructure, "common", ["submit", "cancel"]>("common", ["submit", "cancel"]);
 * // Type error if namespace or keys are invalid
 * 
 * @remarks
 * Overload resolution: The type-safe overload is listed first but requires explicit
 * type parameters. When called without type parameters, TypeScript automatically
 * falls back to the backward-compatible overload that accepts any string.
 */
export function defineRequirement<
  T,
  N extends Namespace<T>,
  const K extends readonly KeysForNamespace<T, N>[],
>(namespace: N, keys: K): TranslationRequirement<K>;
export function defineRequirement<const K extends readonly string[]>(
  namespace: string,
  keys: K
): TranslationRequirement<K>;
export function defineRequirement<const K extends readonly string[]>(
  namespace: string,
  keys: K
): TranslationRequirement<K> {
  return { keys, namespace };
}

/**
 * Get nested object value from dot notation path
 * @param obj - Object to search
 * @param path - Dot notation path (e.g., "profile.name")
 * @returns Found string, or undefined
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current &&
      typeof current === "object" &&
      current !== null &&
      key in current
    ) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Replace placeholders in message with values
 * Placeholder format: {{name}}
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
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, String(value));
  }
  return result;
}
