/**
 * String type representing translation keys
 * Nested structure expressed in dot notation (e.g., "user.profile.name")
 * May include plural suffixes (_zero, _one, _other)
 * @template T - Generated translation keys type (union of all translation keys)
 */
type TranslationKey<T extends string = string> = T;

/**
 * Translation key requirements for a component
 */
export interface TranslationRequirement {
  /** Array of translation keys required by the component (readonly) */
  keys: readonly TranslationKey<string>[];
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
export type RequirementKeys<R> = R extends TranslationRequirement
  ? R["keys"][number]
  : never;

/**
 * Translator function type constrained to specific keys from a TranslationRequirement
 * @template R - TranslationRequirement type that defines allowed keys
 */
export type ConstrainedTranslatorFunction<R> = (
  key: RequirementKeys<R>,
  values?: PlaceholderValues
) => string;
