/**
 * String type representing translation keys
 * Nested structure expressed in dot notation (e.g., "user.profile.name")
 * May include plural suffixes (_zero, _one, _other)
 * @template T - Generated translation keys type (union of all translation keys)
 */
type TranslationKey<T extends string = string> = T;

/**
 * Translation key requirements for a component
 * @template K - Array type of translation keys
 */
export interface TranslationRequirement<
  K extends readonly string[] = readonly string[],
> {
  /** Array of translation keys required by the component (readonly) */
  keys: K;
  /** Translation namespace (e.g., "common", "user", "shop") */
  namespace: string;
}

/**
 * Object storing resolved translation messages
 * Key format: "namespace.key" (e.g., "common.submit")
 * @template K - Translation keys type
 */
export type Messages = Record<string, string>;

/**
 * Object with values to pass to placeholders
 */
export type PlaceholderValues = Record<string, string | number>;

/**
 * Translation file type
 * Top level: Map of namespaces
 * Within namespace: Map of keys and translation strings (allows up to 1 level of nesting)
 */
export type TranslationFile = Record<string, NamespaceTranslations>;

export type NamespaceTranslations = Record<string, string | NestedTranslations>;

export type NestedTranslations = Record<string, string>;

/**
 * Type for locale-indexed translation files
 * Structure: { locale: { namespace: translations } }
 * Example: { en: { common: {...} }, ja: { common: {...} } }
 */
export type LocaleTranslations = Record<string, TranslationFile>;

/**
 * Validation error types
 */
export type ValidationErrorType =
  | "missing-plural-one"
  | "missing-plural-other"
  | "invalid-nesting"
  | "invalid-key-name"
  | "invalid-placeholder"
  | "missing-key"
  | "extra-key";

/**
 * Validation error
 */
export interface ValidationError {
  /** Error type */
  type: ValidationErrorType;
  /** Namespace */
  namespace: string;
  /** Key path */
  key: string;
  /** Error message */
  message: string;
  /** Locale (optional, used for cross-locale validation) */
  locale?: string;
  /** Reference locale (optional, used for cross-locale validation) */
  referenceLocale?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether there are errors */
  valid: boolean;
  /** List of errors */
  errors: ValidationError[];
  /** List of warnings */
  warnings: ValidationError[];
}

// ============================================================================
// Type Safety Utilities
// ============================================================================

/**
 * Type utility to extract keys from a TranslationRequirement
 * @template R - TranslationRequirement type
 */
export type RequirementKeys<R> = R extends TranslationRequirement<infer K>
  ? K[number]
  : never;

/**
 * Translator function type constrained to specific keys from a TranslationRequirement
 * @template R - TranslationRequirement type that defines allowed keys
 */
export type ConstrainedTranslatorFunction<
  R extends TranslationRequirement<readonly string[]>,
> = (key: RequirementKeys<R>, values?: PlaceholderValues) => string;

// ============================================================================
// Type Constraints for defineRequirement
// ============================================================================

/**
 * Extract nested keys from a namespace as dot-notation strings
 * Handles objects that have nested Record<string, string> values
 * 
 * Note: The translation file format only supports up to 1 level of nesting,
 * as defined by the NamespaceTranslations and NestedTranslations types.
 * This is a design constraint of the library.
 * 
 * @template T - The namespace translations object
 */
type ExtractNestedKeys<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends string
        ? never
        : T[K] extends object
          ? K extends string
            ? keyof T[K] extends string
              ? `${K}.${keyof T[K] & string}`
              : never
            : never
          : never;
    }[keyof T]
  : never;

/**
 * Extract all valid keys for a namespace (including top-level and nested keys)
 * @template T - The namespace translations object
 */
type ExtractAllKeys<T> = T extends object
  ? (keyof T & string) | ExtractNestedKeys<T>
  : never;

/**
 * Extract valid namespace names from a translation structure
 * @template T - The translation structure type (e.g., TranslationStructure)
 */
export type Namespace<T = Record<string, unknown>> = Extract<keyof T, string>;

/**
 * Extract valid keys for a specific namespace
 * @template T - The translation structure type
 * @template N - The namespace name
 */
export type KeysForNamespace<
  T,
  N extends Namespace<T>,
> = N extends keyof T ? ExtractAllKeys<T[N]> : never;
