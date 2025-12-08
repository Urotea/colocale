// ============================================================================
// Re-exports from separate modules
// ============================================================================

// Types
export type {
  TranslationRequirement,
  Messages,
  TranslationFile,
  ConstrainedTranslatorFunction,
  LocaleTranslations,
  Namespace,
  KeysForNamespace,
} from "./types";

// Validation
export { validateTranslations, validateCrossLocale } from "./validation";

import { extractPluralKeys, resolvePluralMessage } from "./plural";
import { getNestedValue, replacePlaceholders } from "./utils";

// ============================================================================
// Core API Functions
// ============================================================================

import type {
  ConstrainedTranslatorFunction,
  Messages,
  PlaceholderValues,
  TranslationFile,
  TranslationRequirement,
} from "./types";

/**
 * Merge multiple translation requirements into a single array
 * @param requirements - Translation requirements or arrays of translation requirements (variadic)
 * @returns Flattened array of translation requirements
 */
export function mergeRequirements(
  ...requirements: (
    | TranslationRequirement<readonly string[]>
    | TranslationRequirement<readonly string[]>[]
  )[]
): TranslationRequirement<readonly string[]>[] {
  return requirements.flat();
}

/**
 * Extract only the required translations from translation files
 *
 * When base keys are specified, keys with _zero, _one, _other suffixes are automatically extracted
 *
 * @template R - Array of TranslationRequirements or a single TranslationRequirement
 * @param allMessages - Object containing all translation data
 * @param requirements - List of required translation keys or a single requirement
 * @returns Messages object (key format: "namespace.key")
 */
export function pickMessages<
  R extends
    | readonly TranslationRequirement<readonly string[]>[]
    | TranslationRequirement<readonly string[]>
>(allMessages: TranslationFile, requirements: R): Messages {
  const messages: Record<string, string> = {};

  const requirementsArray = Array.isArray(requirements)
    ? requirements
    : [requirements];

  for (const requirement of requirementsArray) {
    const { namespace, keys } = requirement;
    const namespaceData = allMessages[namespace];

    if (!namespaceData) {
      continue;
    }

    for (const key of keys) {
      // Check direct key (flat structure)
      const value = getNestedValue(namespaceData, key);
      if (value !== undefined) {
        messages[`${namespace}.${key}`] = value;
      }

      // Attempt automatic extraction of plural keys
      const pluralKeys = extractPluralKeys(allMessages, namespace, key);
      for (const pluralKey of pluralKeys) {
        const value = getNestedValue(namespaceData, pluralKey);
        if (value !== undefined) {
          messages[`${namespace}.${pluralKey}`] = value;
        }
      }
    }
  }

  return messages;
}

/**
 * Generate a translation function bound to a specific namespace with keys constrained by TranslationRequirement
 *
 * When values contain a count property, automatic plural handling is performed
 *
 * @template R - TranslationRequirement type that defines allowed keys
 * @param messages - Messages object
 * @param requirement - TranslationRequirement that defines the namespace and allowed keys
 * @returns Translation function constrained to keys in the requirement
 *
 * @example
 * ```typescript
 * import { createTranslator, defineRequirement } from "colocale";
 *
 * const userProfileTranslations = defineRequirement("user", [
 *   "profile.name",
 *   "profile.email",
 * ]);
 *
 * const t = createTranslator(messages, userProfileTranslations);
 * t("profile.name"); // ✓ OK
 * t("profile.invalid"); // ✗ Type error
 * ```
 */
export function createTranslator<
  R extends TranslationRequirement<readonly string[]>
>(messages: Messages, requirement: R): ConstrainedTranslatorFunction<R> {
  const namespace = requirement.namespace;

  return (key: string, values?: PlaceholderValues): string => {
    let message: string | undefined;

    // If count is provided, attempt plural handling
    if (values && "count" in values && typeof values.count === "number") {
      message = resolvePluralMessage(messages, namespace, key, values.count);
    }

    // If not plural or plural resolution failed, try regular key
    if (message === undefined) {
      const fullKey = `${namespace}.${key}`;
      message = messages[fullKey];
    }

    // If message not found, return key as-is
    if (message === undefined) {
      return key;
    }

    // Replace placeholders
    if (values) {
      return replacePlaceholders(message, values);
    }

    return message;
  };
}
