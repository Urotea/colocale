import type {
  LocaleTranslations,
  NamespaceTranslations,
  TranslationFile,
  ValidationError,
  ValidationResult,
} from "./types";

/**
 * Collect all keys from a translation object (flat structure only)
 */
function collectAllKeys(obj: NamespaceTranslations, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const key in obj) {
    if (typeof obj[key] === "string") {
      keys.add(key);
    }
  }

  return keys;
}

/**
 * Check plural key consistency
 */
function validatePluralKeys(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];
  const keys = new Set<string>();
  const pluralKeys = new Map<string, Set<string>>();

  // Collect all keys (including nested keys) using the helper function
  const allKeys = collectAllKeys(translations);
  allKeys.forEach((key) => keys.add(key));

  // Classify plural keys
  for (const key of keys) {
    const match = key.match(/^(.+)_(one|other)$/);
    if (match) {
      const baseKey = match[1];
      const suffix = match[2];
      if (!pluralKeys.has(baseKey)) {
        pluralKeys.set(baseKey, new Set());
      }
      pluralKeys.get(baseKey)!.add(suffix);
    }
  }

  // Check plural key consistency
  for (const [baseKey, suffixes] of pluralKeys) {
    if (!suffixes.has("one")) {
      errors.push({
        type: "missing-plural-one",
        namespace,
        key: baseKey,
        message: `Plural key "${baseKey}_one" is required (Intl.PluralRules compatible)`,
      });
    }
    if (!suffixes.has("other")) {
      errors.push({
        type: "missing-plural-other",
        namespace,
        key: baseKey,
        message: `Plural key "${baseKey}_other" is required (Intl.PluralRules compatible)`,
      });
    }
  }

  return errors;
}

/**
 * Check nesting depth (must be flat - level 0 only)
 */
function validateNesting(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const key in translations) {
    const value = translations[key];
    if (typeof value === "object" && value !== null) {
      errors.push({
        type: "invalid-nesting",
        namespace,
        key,
        message: `Nested structures are not allowed. Use flat structure with dot notation (e.g., "profile.name"): "${key}"`,
      });
    }
  }

  return errors;
}

/**
 * Check key naming rules (allows dot notation for flat structure)
 */
function validateKeyNames(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];
  // Allow dots in keys for flat structure (e.g., "profile.name")
  const validKeyPattern = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

  for (const key in translations) {
    if (!validKeyPattern.test(key)) {
      errors.push({
        type: "invalid-key-name",
        namespace,
        key: key,
        message: `Invalid key name: "${key}" (only alphanumeric, underscore, and dots allowed)`,
      });
    }
  }

  return errors;
}

/**
 * Check placeholder validity
 */
function validatePlaceholders(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];
  const placeholderPattern = /\{\{([^{}]+)\}\}/g;

  for (const key in translations) {
    if (typeof translations[key] === "string") {
      const matches = translations[key].matchAll(placeholderPattern);
      for (const match of matches) {
        const placeholderName = match[1];
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(placeholderName)) {
          errors.push({
            type: "invalid-placeholder",
            namespace,
            key: key,
            message: `Invalid placeholder: "{{${placeholderName}}}" (only alphanumeric and underscore allowed)`,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate entire translation file
 *
 * @param translations - Translation file to validate
 * @returns Validation result
 */
export function validateTranslations(
  translations: TranslationFile
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const namespace in translations) {
    const namespaceTranslations = translations[namespace];

    // Execute various validations
    errors.push(...validatePluralKeys(namespace, namespaceTranslations));
    errors.push(...validateNesting(namespace, namespaceTranslations));
    errors.push(...validateKeyNames(namespace, namespaceTranslations));
    errors.push(...validatePlaceholders(namespace, namespaceTranslations));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate cross-locale key consistency
 *
 * @param localeTranslations - Translations for all locales
 * @returns Validation result with cross-locale errors
 */
export function validateCrossLocale(
  localeTranslations: LocaleTranslations
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const locales = Object.keys(localeTranslations);
  if (locales.length < 2) {
    // No cross-locale validation needed for single locale
    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  // Collect all namespaces across all locales
  const allNamespaces = new Set<string>();
  for (const locale of locales) {
    const namespaces = Object.keys(localeTranslations[locale]);
    namespaces.forEach((ns) => allNamespaces.add(ns));
  }

  // For each namespace, compare keys across locales
  for (const namespace of allNamespaces) {
    // Collect keys for each locale in this namespace
    const localeKeys = new Map<string, Set<string>>();

    for (const locale of locales) {
      const translations = localeTranslations[locale]?.[namespace];
      if (translations) {
        localeKeys.set(locale, collectAllKeys(translations));
      } else {
        localeKeys.set(locale, new Set());
      }
    }

    // Use first locale as reference
    const referenceLocale = locales[0];
    const referenceKeys = localeKeys.get(referenceLocale) || new Set();

    // Check each other locale against reference
    for (let i = 1; i < locales.length; i++) {
      const targetLocale = locales[i];
      const targetKeys = localeKeys.get(targetLocale) || new Set();

      // Check for missing keys in target locale
      for (const key of referenceKeys) {
        if (!targetKeys.has(key)) {
          errors.push({
            type: "missing-key",
            namespace,
            key,
            locale: targetLocale,
            referenceLocale,
            message: `Key "${key}" exists in "${referenceLocale}" but missing in "${targetLocale}"`,
          });
        }
      }

      // Check for extra keys in target locale
      for (const key of targetKeys) {
        if (!referenceKeys.has(key)) {
          errors.push({
            type: "extra-key",
            namespace,
            key,
            locale: targetLocale,
            referenceLocale,
            message: `Key "${key}" exists in "${targetLocale}" but not in "${referenceLocale}"`,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
