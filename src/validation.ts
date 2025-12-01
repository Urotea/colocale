import type {
  ValidationError,
  ValidationResult,
  TranslationFile,
  NamespaceTranslations,
} from "./types";

/**
 * 複数形キーの整合性をチェック
 */
function validatePluralKeys(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];
  const keys = new Set<string>();
  const pluralKeys = new Map<string, Set<string>>();

  // すべてのキーを収集（ネストしたキーも含む）
  function collectKeys(obj: any, prefix = "") {
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "string") {
        keys.add(fullKey);
      } else if (typeof obj[key] === "object") {
        collectKeys(obj[key], fullKey);
      }
    }
  }

  collectKeys(translations);

  // 複数形キーを分類
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
 * ネスト深度をチェック
 */
function validateNesting(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];

  function checkDepth(obj: any, path: string, depth: number) {
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
 * キーの命名規則をチェック
 */
function validateKeyNames(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];
  const validKeyPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  function checkKeys(obj: any, path: string) {
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
 * プレースホルダーの妥当性をチェック
 */
function validatePlaceholders(
  namespace: string,
  translations: NamespaceTranslations
): ValidationError[] {
  const errors: ValidationError[] = [];
  const placeholderPattern = /\{([^}]+)\}/g;

  function checkPlaceholders(obj: any, path: string) {
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
              message: `Invalid placeholder: "{${placeholderName}}" (only alphanumeric and underscore allowed)`,
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
 * 翻訳ファイル全体を検証
 *
 * @param translations - 検証する翻訳ファイル
 * @returns 検証結果
 */
export function validateTranslations(
  translations: TranslationFile
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const namespace in translations) {
    const namespaceTranslations = translations[namespace];

    // 各種検証を実行
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
