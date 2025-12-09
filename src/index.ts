// ============================================================================
// Re-exports from separate modules
// ============================================================================

// Types
export type {
  TranslationRequirement,
  Messages,
  TranslationFile,
  TranslationInput,
  ConstrainedTranslatorFunction,
  LocaleTranslations,
  Locale,
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
  Locale,
  Messages,
  PlaceholderValues,
  TranslationFile,
  TranslationInput,
  TranslationRequirement,
} from "./types";

/**
 * Detect if the input is locale-grouped format or namespace-grouped format
 * @param input - Translation input data
 * @param locale - Target locale
 * @returns True if input is locale-grouped format
 */
function isLocaleGrouped(input: TranslationInput, locale: Locale): boolean {
  // Check if the input has the locale as a top-level key
  // and that key's value is an object that looks like a TranslationFile
  if (locale in input) {
    const localeData = input[locale];
    if (typeof localeData === "object" && localeData !== null) {
      // Check if the structure looks like TranslationFile (namespace -> translations)
      for (const key in localeData) {
        const value = (localeData as Record<string, unknown>)[key];
        if (typeof value === "object" && value !== null) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Extract TranslationFile from input based on format
 * @param input - Translation input data (either format)
 * @param locale - Target locale
 * @returns TranslationFile for the specified locale
 */
function extractTranslationFile(
  input: TranslationInput,
  locale: Locale
): TranslationFile {
  if (isLocaleGrouped(input, locale)) {
    // Locale-grouped format: return the translations for the specified locale
    return (input[locale] as TranslationFile) || {};
  }
  // Namespace-grouped format: return as-is
  return input as TranslationFile;
}

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
 * When base keys are specified, keys with _one, _other suffixes are automatically extracted
 *
 * @template R - Array of TranslationRequirements or a single TranslationRequirement
 * @param allMessages - Object containing all translation data (supports both namespace-grouped and locale-grouped formats)
 * @param requirements - List of required translation keys or a single requirement
 * @param locale - Locale identifier (e.g., "en", "ja")
 * @returns Messages object with locale information
 */
export function pickMessages<
  R extends
    | readonly TranslationRequirement<readonly string[]>[]
    | TranslationRequirement<readonly string[]>,
>(allMessages: TranslationInput, requirements: R, locale: Locale): Messages {
  const translations: Record<string, string> = {};

  // Extract the appropriate TranslationFile based on the format
  const translationFile = extractTranslationFile(allMessages, locale);

  const requirementsArray = Array.isArray(requirements)
    ? requirements
    : [requirements];

  for (const requirement of requirementsArray) {
    const { namespace, keys } = requirement;
    const namespaceData = translationFile[namespace];

    if (!namespaceData) {
      continue;
    }

    for (const key of keys) {
      // Check direct key (flat structure)
      const value = getNestedValue(namespaceData, key);
      if (value !== undefined) {
        translations[`${namespace}.${key}`] = value;
      }

      // Attempt automatic extraction of plural keys
      const pluralKeys = extractPluralKeys(translationFile, namespace, key);
      for (const pluralKey of pluralKeys) {
        const value = getNestedValue(namespaceData, pluralKey);
        if (value !== undefined) {
          translations[`${namespace}.${pluralKey}`] = value;
        }
      }
    }
  }

  return { locale, translations };
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
  R extends TranslationRequirement<readonly string[]>,
>(messages: Messages, requirement: R): ConstrainedTranslatorFunction<R> {
  const namespace = requirement.namespace;
  const locale = messages.locale;

  return (key: string, values?: PlaceholderValues): string => {
    let message: string | undefined;

    // If count is provided, attempt plural handling
    if (values && "count" in values && typeof values.count === "number") {
      message = resolvePluralMessage(
        messages.translations,
        namespace,
        key,
        values.count,
        locale
      );
    }

    // If not plural or plural resolution failed, try regular key
    if (message === undefined) {
      const fullKey = `${namespace}.${key}`;
      message = messages.translations[fullKey];
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
