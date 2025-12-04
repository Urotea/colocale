import type {
  KeysForNamespace,
  Namespace,
  PlaceholderValues,
  TranslationRequirement,
} from "./types";

/**
 * Helper function to create a TranslationRequirement with type inference
 *
 * Requires explicit type parameters for full type safety. The translation structure type
 * must be provided to ensure namespace and keys are valid at compile time.
 *
 * @template T - The translation structure type (e.g., TranslationStructure)
 * @template N - The namespace type (inferred from namespace parameter)
 * @template K - Array type of translation keys (inferred from keys parameter)
 * @param namespace - Translation namespace (e.g., "common", "user", "shop")
 * @param keys - Array of translation keys
 * @returns TranslationRequirement with inferred key types
 *
 * @example
 * import type { TranslationStructure } from "./messages.types";
 * const req = defineRequirement<TranslationStructure, "common", ["submit", "cancel"]>("common", ["submit", "cancel"]);
 * // Type error if namespace or keys are invalid
 */
function defineRequirement<
  T,
  N extends Namespace<T>,
  const K extends readonly KeysForNamespace<T, N>[]
>(namespace: N, keys: K): TranslationRequirement<K> {
  return { keys, namespace };
}

/**
 * Create a type-specific defineRequirement function with full type inference
 *
 * This helper uses currying to enable better type inference ergonomics. By specifying
 * the translation structure type once, subsequent calls get full type safety without
 * requiring verbose type parameters.
 *
 * @template T - The translation structure type (e.g., TranslationStructure)
 * @returns A function that defines requirements for the given translation structure
 *
 * @example
 * ```typescript
 * import { createDefineRequirement } from 'colocale';
 * import type { TranslationStructure } from './messages.types';
 *
 * // Create a typed helper once
 * const defineRequirement = createDefineRequirement<TranslationStructure>();
 *
 * // Use it with full type inference and type safety
 * const requirement = defineRequirement("common", ["submit", "cancel"]);
 * //                                      ^         ^
 * //                                      Type-checked against TranslationStructure
 * ```
 */
export function createDefineRequirement<T>() {
  return <
    N extends Namespace<T>,
    const K extends readonly KeysForNamespace<T, N>[]
  >(
    namespace: N,
    keys: K
  ): TranslationRequirement<K> => defineRequirement<T, N, K>(namespace, keys);
}

/**
 * Get nested object value from dot notation path
 * @param obj - Object to search
 * @param path - Dot notation path (e.g., "profile.name")
 * @returns Found string, or undefined
 * @internal
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
