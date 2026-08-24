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
 *
 * @template L - Locale type. Defaults to any locale string. Pass a narrower union
 * to restrict which locales a component accepts (e.g. `Messages<"en" | "ja">`).
 */
export interface Messages<L extends Locale = Locale> {
  /** Locale identifier (e.g., "en", "ja", "en-US") */
  locale: L;
  /** Translation messages map */
  translations: Record<string, string>;
}

/**
 * Object with values to pass to placeholders
 */
export type PlaceholderValues = Record<string, string | number>;

/**
 * Translation file type
 * Top level: Map of namespaces
 * Within namespace: Map of keys and translation strings (flat structure only)
 */
export type TranslationFile = Record<string, NamespaceTranslations>;

export type NamespaceTranslations = Record<string, string>;

/**
 * Locale identifier type
 * Any BCP 47 language tag is accepted (e.g. "en", "ja", "en-US", "zh-Hant-TW"),
 * so the library supports every language without patching this type.
 *
 * Pluralization is delegated to `Intl.PluralRules`, which accepts the same tags.
 * A malformed tag does not throw: plural resolution falls back to the `_other` form.
 *
 * If your application wants a closed set of locales, declare your own union and
 * pass it to the generic types instead of narrowing this one:
 *
 * ```typescript
 * export type AppLocale = "en" | "ja" | "fr";
 *
 * // Only accepts messages for a known locale
 * function UserPage(props: { messages: Messages<AppLocale> }) { ... }
 *
 * // Inferred as Messages<"fr">, assignable to Messages<AppLocale>
 * const messages = pickMessages(allMessages, requirements, "fr");
 * ```
 */
export type Locale = string;

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
type RequirementKeys<R> =
  R extends TranslationRequirement<infer K> ? K[number] : never;

/**
 * Translator function type constrained to specific keys from a TranslationRequirement
 * @template R - TranslationRequirement type that defines allowed keys
 */
export type ConstrainedTranslatorFunction<
  R extends TranslationRequirement<readonly string[]>,
> = (key: RequirementKeys<R>, values?: PlaceholderValues) => string;

/**
 * Unconstrained translator function type
 *
 * Returned by `createTranslator` when no TranslationRequirement is given. Since
 * there is no namespace to prefix, keys must be passed in their fully qualified
 * `"namespace.key"` form (e.g. `"common.submit"`)
 */
export type TranslatorFunction = (
  key: string,
  values?: PlaceholderValues
) => string;

// ============================================================================
// Type Constraints for defineRequirement
// ============================================================================

/**
 * Extract all valid keys for a namespace (flat structure only)
 * @template T - The namespace translations object (Record<string, string>)
 */
type ExtractAllKeys<T> = T extends object ? keyof T & string : never;

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
export type KeysForNamespace<T, N extends Namespace<T>> = N extends keyof T
  ? ExtractAllKeys<T[N]>
  : never;
