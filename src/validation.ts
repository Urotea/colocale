import type {
  LocaleTranslations,
  NamespaceTranslations,
  NestedTranslations,
  TranslationFile,
  ValidationError,
  ValidationResult,
} from "./types";

/**
 * Collect all keys from a translation object (including nested keys)
 */
function collectAllKeys(obj: NamespaceTranslations, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "string") {
      keys.add(fullKey);
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      const nestedKeys = collectAllKeys(obj[key], fullKey);
      nestedKeys.forEach((k) => keys.add(k));
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
    const match = key.match(/^(.+)_(zero|one|other)$/);
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
        message: `Plural key "${baseKey}_one" is required (react-i18next compatible)`,
      });
    }
    if (!suffixes.has("other")) {
      errors.push({
        type: "missing-plural-other",
        namespace,
        key: baseKey,
        message: `Plural key "${baseKey}_other" is required (react-i18next compatible)`,
      });
    }
  }

  return errors;
}

/**
 * Check nesting depth
 */
function validateNesting(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];

  function checkDepth(
    obj: NamespaceTranslations | NestedTranslations,
    path: string,
    depth: number
  ) {
    if (depth > 1) {
      errors.push({
        type: "invalid-nesting",
        namespace,
        key: path,
        message: `Nesting depth must be 1 level or less: "${path}"`,
      });
      return;
    }

    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        checkDepth(obj[key], currentPath, depth + 1);
      }
    }
  }

  checkDepth(translations, "", 0);

  return errors;
}

/**
 * Check key naming rules
 */
function validateKeyNames(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];
  const validKeyPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  function checkKeys(
    obj: NamespaceTranslations | NestedTranslations,
    path: string
  ) {
    for (const key in obj) {
      if (!validKeyPattern.test(key)) {
        errors.push({
          type: "invalid-key-name",
          namespace,
          key: path ? `${path}.${key}` : key,
          message: `Invalid key name: "${key}" (only alphanumeric and underscore allowed)`,
        });
      }

      const currentPath = path ? `${path}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        checkKeys(obj[key], currentPath);
      }
    }
  }

  checkKeys(translations, "");

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

  function checkPlaceholders(
    obj: NamespaceTranslations | NestedTranslations,
    path: string
  ) {
    for (const key in obj) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof obj[key] === "string") {
        const matches = obj[key].matchAll(placeholderPattern);
        for (const match of matches) {
          const placeholderName = match[1];
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(placeholderName)) {
            errors.push({
              type: "invalid-placeholder",
              namespace,
              key: currentPath,
              message: `Invalid placeholder: "{{${placeholderName}}}" (only alphanumeric and underscore allowed)`,
            });
          }
        }
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        checkPlaceholders(obj[key], currentPath);
      }
    }
  }

  checkPlaceholders(translations, "");

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
