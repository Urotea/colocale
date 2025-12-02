/**
 * String type representing translation keys
 * Nested structure expressed in dot notation (e.g., "user.profile.name")
 * May include plural suffixes (_zero, _one, _other)
 * @template T - Generated translation keys type (union of all translation keys)
 */
export type TranslationKey<T extends string = string> = T;

/**
 * Translation key requirements for a component
 * @template K - Translation keys type
 */
export interface TranslationRequirement<K extends string = string> {
  /** Array of translation keys required by the component (readonly) */
  keys: readonly TranslationKey<K>[];
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
 * Options used for plural handling
 */
export interface PluralOptions {
  /** Numeric value used for plural determination */
  count: number;
}

/**
 * Translation file type
 * Top level: Map of namespaces
 * Within namespace: Map of keys and translation strings (allows up to 1 level of nesting)
 */
export type TranslationFile = Record<string, NamespaceTranslations>;

export type NamespaceTranslations = Record<string, string | NestedTranslations>;

export type NestedTranslations = Record<string, string>;

/**
 * Translator function type
 * @template K - Translation keys type
 */
export type TranslatorFunction<K extends string = string> = (
  key: K,
  values?: PlaceholderValues
) => string;

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
 * Type utility to generate dot notation key paths from nested objects
 */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

/**
 * Type-safe translation requirement
 */
export interface TypedTranslationRequirement<
  N extends string,
  K extends string
> {
  keys: readonly K[];
  namespace: N;
}

/**
 * Type utility to extract available keys from namespace
 */
export type ExtractKeys<N extends string, AllKeys extends string> = Extract<
  AllKeys,
  `${N}.${string}`
> extends `${N}.${infer K}`
  ? K
  : never;

/**
 * Type-safe translator function
 */
export type TypedTranslator<
  N extends string,
  AllKeys extends string = string
> = <K extends ExtractKeys<N, AllKeys>>(
  key: K,
  values?: PlaceholderValues
) => string;

/**
 * Type utility to extract keys from a TranslationRequirement
 * @template R - TranslationRequirement type
 */
export type RequirementKeys<R> = R extends TranslationRequirement<infer K>
  ? K
  : R extends TypedTranslationRequirement<infer _N, infer K>
  ? K
  : never;

/**
 * Translator function type constrained to specific keys from a TranslationRequirement
 * @template R - TranslationRequirement type that defines allowed keys
 */
export type ConstrainedTranslatorFunction<R> = (
  key: RequirementKeys<R>,
  values?: PlaceholderValues
) => string;
