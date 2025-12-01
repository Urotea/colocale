// ============================================================================
// Type Definitions
// ============================================================================

/**
 * 翻訳キーを表す文字列型
 * ネスト構造をドット記法で表現（例: "user.profile.name"）
 * 複数形のサフィックス（_zero, _one, _other）を含む場合もある
 */
export type TranslationKey = string;

/**
 * コンポーネントが必要とする翻訳キーの要求
 */
export interface TranslationRequirement {
  /** コンポーネントが必要とする翻訳キーの配列（読み取り専用） */
  keys: readonly TranslationKey[];
  /** 翻訳の名前空間（例: "common", "user", "shop"） */
  namespace: string;
}

/**
 * 解決済み翻訳メッセージを格納するオブジェクト
 * キー形式: "namespace.key" （例: "common.submit"）
 */
export type Messages = Record<string, string>;

/**
 * プレースホルダーに渡す値のオブジェクト
 */
export type PlaceholderValues = Record<string, string | number>;

/**
 * 複数形処理に使用するオプション
 */
export interface PluralOptions {
  /** 複数形判定に使用する数値 */
  count: number;
}

/**
 * 翻訳ファイルの型
 * トップレベル: 名前空間のマップ
 * 名前空間内: キーと翻訳文字列のマップ（1階層のネストまで許可）
 */
export type TranslationFile = Record<string, NamespaceTranslations>;

export type NamespaceTranslations = Record<string, string | NestedTranslations>;

export type NestedTranslations = Record<string, string>;

/**
 * 翻訳関数の型
 */
export type TranslatorFunction = (
  key: string,
  values?: PlaceholderValues
) => string;

// ============================================================================
// Internal Utility Functions
// ============================================================================

/**
 * ドット記法のパスからネストしたオブジェクトの値を取得
 * @param obj - 検索対象のオブジェクト
 * @param path - ドット記法のパス（例: "profile.name"）
 * @returns 見つかった文字列、または undefined
 */
function getNestedValue(
  obj: Record<string, any>,
  path: string
): string | undefined {
  const keys = path.split(".");
  let current: any = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * メッセージ内のプレースホルダーを値で置換
 * プレースホルダー形式: {name}
 * @param message - プレースホルダーを含む文字列
 * @param values - 置換する値のオブジェクト
 * @returns 置換後の文字列
 */
function replacePlaceholders(
  message: string,
  values: PlaceholderValues
): string {
  let result = message;
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{${key}}`;
    result = result.replaceAll(placeholder, String(value));
  }
  return result;
}

/**
 * 数値に応じて適切な複数形キーのサフィックスを選択
 * @param baseKey - 基本キー名（例: "itemCount"）
 * @param count - 判定する数値
 * @returns サフィックス付きキー（例: "itemCount_zero", "itemCount_one", "itemCount_other"）
 */
function selectPluralKey(baseKey: string, count: number): string {
  if (count === 0) {
    return `${baseKey}_zero`;
  } else if (count === 1) {
    return `${baseKey}_one`;
  } else {
    return `${baseKey}_other`;
  }
}

/**
 * 複数形ルールに基づいてメッセージを解決
 * @param messages - Messages オブジェクト
 * @param namespace - 名前空間
 * @param baseKey - 基本キー
 * @param count - 数値
 * @returns 解決されたメッセージ、または undefined
 */
function resolvePluralMessage(
  messages: Messages,
  namespace: string,
  baseKey: string,
  count: number
): string | undefined {
  const selectedKey = selectPluralKey(baseKey, count);
  const fullKey = `${namespace}.${selectedKey}`;

  // 選択されたキーを試す
  if (fullKey in messages) {
    return messages[fullKey];
  }

  // _zero または _one が見つからない場合、_other にフォールバック
  if (count === 0 || count === 1) {
    const otherKey = `${namespace}.${baseKey}_other`;
    if (otherKey in messages) {
      return messages[otherKey];
    }
  }

  return undefined;
}

/**
 * 翻訳ファイルから複数形に関連するすべてのキーを抽出
 * @param allMessages - 全翻訳データ
 * @param namespace - 名前空間
 * @param baseKey - 基本キー
 * @returns 存在する複数形キーの配列
 */
function extractPluralKeys(
  allMessages: Record<string, any>,
  namespace: string,
  baseKey: string
): string[] {
  const namespaceData = allMessages[namespace];
  if (!namespaceData) {
    return [];
  }

  const pluralKeys: string[] = [];
  const suffixes = ["_zero", "_one", "_other"];

  for (const suffix of suffixes) {
    const keyWithSuffix = `${baseKey}${suffix}`;
    // 直接キーをチェック
    if (keyWithSuffix in namespaceData) {
      pluralKeys.push(keyWithSuffix);
    } else {
      // ネストしたキーをチェック
      const value = getNestedValue(namespaceData, keyWithSuffix);
      if (value !== undefined) {
        pluralKeys.push(keyWithSuffix);
      }
    }
  }

  return pluralKeys;
}

// ============================================================================
// Core API Functions
// ============================================================================

/**
 * 複数の翻訳要求を1つの配列にマージ
 * @param requirements - 翻訳要求またはその配列（可変長引数）
 * @returns フラット化された翻訳要求の配列
 */
export function mergeRequirements(
  ...requirements: (TranslationRequirement | TranslationRequirement[])[]
): TranslationRequirement[] {
  return requirements.flat(Infinity) as TranslationRequirement[];
}

/**
 * 翻訳ファイルから必要な翻訳のみを抽出
 *
 * 基本キーが指定された場合、_zero, _one, _other サフィックス付きキーも自動的に抽出
 *
 * @param allMessages - 全翻訳データを含むオブジェクト
 * @param requirements - 必要な翻訳キーのリスト
 * @returns Messages オブジェクト（キー形式: "namespace.key"）
 */
export function pickMessages(
  allMessages: TranslationFile,
  requirements: TranslationRequirement[]
): Messages {
  const messages: Messages = {};
  const isDev = process.env.NODE_ENV === "development";

  for (const requirement of requirements) {
    const { namespace, keys } = requirement;
    const namespaceData = allMessages[namespace];

    if (!namespaceData) {
      if (isDev) {
        console.warn(`[colocale] Namespace "${namespace}" not found`);
      }
      continue;
    }

    for (const key of keys) {
      // 直接キーをチェック
      if (typeof namespaceData[key] === "string") {
        messages[`${namespace}.${key}`] = namespaceData[key] as string;
      } else {
        // ネストしたキーをチェック
        const value = getNestedValue(namespaceData, key);
        if (value !== undefined) {
          messages[`${namespace}.${key}`] = value;
        } else if (isDev) {
          console.warn(
            `[colocale] Translation key "${key}" not found in namespace "${namespace}"`
          );
        }
      }

      // 複数形キーの自動抽出を試みる
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
 * 特定の名前空間に紐づいた翻訳関数を生成
 *
 * values に count プロパティが含まれている場合、自動的に複数形処理を行う
 *
 * @param messages - Messages オブジェクト
 * @param namespace - 翻訳の名前空間
 * @returns 翻訳関数
 */
export function createTranslator(
  messages: Messages,
  namespace: string
): TranslatorFunction {
  const isDev = process.env.NODE_ENV === "development";

  return (key: string, values?: PlaceholderValues): string => {
    let message: string | undefined;

    // count が提供されている場合、複数形処理を試みる
    if (values && "count" in values && typeof values.count === "number") {
      message = resolvePluralMessage(messages, namespace, key, values.count);
    }

    // 複数形でない、または複数形の解決に失敗した場合、通常のキーを試す
    if (message === undefined) {
      const fullKey = `${namespace}.${key}`;
      message = messages[fullKey];
    }

    // メッセージが見つからない場合、キーをそのまま返す
    if (message === undefined) {
      if (isDev) {
        console.warn(`[colocale] Translation not found: "${namespace}.${key}"`);
      }
      return key;
    }

    // プレースホルダーの置換
    if (values) {
      return replacePlaceholders(message, values);
    }

    return message;
  };
}

// ============================================================================
// Type Safety Utilities
// ============================================================================

/**
 * ネストしたオブジェクトからドット記法のキーパスを生成する型ユーティリティ
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
 * 型安全な翻訳要求
 */
export interface TypedTranslationRequirement<
  N extends string,
  K extends string
> {
  keys: readonly K[];
  namespace: N;
}

/**
 * 名前空間から利用可能なキーを抽出する型ユーティリティ
 */
export type ExtractKeys<N extends string, AllKeys extends string> = Extract<
  AllKeys,
  `${N}.${string}`
> extends `${N}.${infer K}`
  ? K
  : never;

/**
 * 型安全な翻訳関数
 */
export type TypedTranslator<
  N extends string,
  AllKeys extends string = string
> = <K extends ExtractKeys<N, AllKeys>>(
  key: K,
  values?: PlaceholderValues
) => string;
