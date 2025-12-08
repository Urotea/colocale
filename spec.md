# colocale

## 1. 概要

### 1.1 目的

Next.js App Router において、サーバーコンポーネントとクライアントコンポーネントの両方で統一的に使用できる i18n ライブラリを提供する。GraphQL の fragment collocation パターンを応用し、各コンポーネントが必要な翻訳キーを宣言的に定義できる仕組みを実現する。

### 1.2 主要機能

- プレースホルダー置換機能
- 複数形対応（Pluralization）- Intl.PluralRules を使用
- TypeScript による型安全性
- Fragment collocation パターンによる翻訳キーの管理
- サーバー・クライアントコンポーネント両対応

### 1.3 実装しない機能

- 日付・数値フォーマッター（将来的な拡張として検討）
- 動的インポート（全翻訳ファイルを事前ロード）

## 2. アーキテクチャ

### 2.1 設計思想

1. **Colocation**: 翻訳キーの定義をコンポーネントファイルと同じ場所に配置
2. **Explicit Dependencies**: 各コンポーネントが必要な翻訳を明示的に宣言
3. **Type Safety**: TypeScript の型システムを活用した安全性の確保
4. **Composition**: 子コンポーネントの翻訳要求を親が集約

### 2.2 データフロー

```
翻訳ファイル (JSON)
    ↓
最上位コンポーネント（翻訳要求を受け取る）
    ↓
翻訳抽出・解決
    ↓
Messages オブジェクト
    ↓
propsとして各コンポーネントに渡される
    ↓
コンポーネント内で翻訳関数を使用
```

## 3. 型定義

### 3.1 基本型

#### 3.1.1 TranslationKey

```typescript
type TranslationKey = string;
```

- 翻訳キーを表す文字列型
- ネスト構造をドット記法で表現（例: `"profile.name"`）
- 複数形のサフィックス（`_one`, `_other`）を含む場合もある

#### 3.1. 2 TranslationRequirement

```typescript
interface TranslationRequirement {
  keys: readonly TranslationKey[];
  namespace: string;
}
```

- `keys`: コンポーネントが必要とする翻訳キーの配列（読み取り専用）
- `namespace`: 翻訳の名前空間（例: `"common"`, `"user"`, `"shop"`）
- **注意**: 複数形を使用する場合、基本キー（例: `"itemCount"`）のみを指定し、サフィックス付きキー（例: `"itemCount_one"`, `"itemCount_other"`）は自動的に解決される

#### 3.1.3 Messages

```typescript
type Messages = Record<string, string>;
```

- 解決済み翻訳メッセージを格納するオブジェクト
- キー形式: `"namespace.key"` （例: `"common.submit"`）
- 値: 翻訳済み文字列

#### 3.1.4 PlaceholderValues

```typescript
type PlaceholderValues = Record<string, string | number>;
```

- プレースホルダーに渡す値のオブジェクト
- キー: プレースホルダー名
- 値: 文字列または数値

#### 3.1.5 PluralOptions

```typescript
interface PluralOptions {
  count: number;
}
```

- 複数形処理に使用するオプション
- `count`: 複数形判定に使用する数値

### 3.2 翻訳ファイルの型

#### 3.2.1 TranslationFile

```typescript
type TranslationFile = Record<string, NamespaceTranslations>;

type NamespaceTranslations = Record<string, string>;
```

- トップレベル: 名前空間のマップ
- 名前空間内: キーと翻訳文字列のマップ（フラット構造のみ、レベル0）

## 4. 翻訳ファイル形式

### 4.1 ファイル構造

```
messages/
  ├── ja. json
  ├── en. json
  └── [locale]. json
```

### 4. 2 JSON 構造

#### 4.2.1 基本形式

```json
{
  "namespace": {
    "key": "翻訳文字列"
  }
}
```

#### 4.2.2 Flat structure with dot notation (Level 0)

```json
{
  "user": {
    "profile.name": "名前",
    "profile.email": "メールアドレス"
  }
}
```

#### 4. 2.3 プレースホルダー形式

```json
{
  "results": {
    "itemsFound": "{{count}}件取得しました",
    "greeting": "こんにちは、{{name}}さん"
  }
}
```

- プレースホルダー: `{{placeholderName}}` 形式
- 大文字小文字を区別
- 同一プレースホルダーの複数使用可能

#### 4.2.4 複数形形式

**基本形式:**

```json
{
  "common": {
    "itemCount_one": "1件のアイテム",
    "itemCount_other": "{{count}}件のアイテム"
  }
}
```

**サフィックスの種類:**

- `_one`: Intl.PluralRules が "one" を返す場合（通常、値が 1 の場合）
- `_other`: その他の場合（必須）

**ネストとの組み合わせ:**

```json
{
  "shop": {
    "cart.item_one": "1個の商品",
    "cart.item_other": "{{count}}個の商品"
  }
}
```

**英語の例:**

```json
{
  "common": {
    "itemCount_one": "1 item",
    "itemCount_other": "{{count}} items"
  }
}
```

**複数形ルール選択ロジック:**

1. `Intl.PluralRules` を使用して適切なフォームを決定（例: "one", "other"）
2. 決定されたフォームに対応するキー（例: `key_one`, `key_other`）を使用
3. 該当するキーが存在しない場合、`key_other` にフォールバック
4. 言語によって異なるルールが適用される（例: 英語では 1 が "one"、それ以外が "other"）

---

## 5. コア API

### 5.1 翻訳要求の定義

#### 5.1. 1 mergeRequirements

```typescript
function mergeRequirements(
  ...requirements: (TranslationRequirement | TranslationRequirement[])[]
): TranslationRequirement[];
```

**目的:** 複数の翻訳要求を 1 つの配列にマージ

**引数:**

- `requirements`: 翻訳要求またはその配列（可変長引数）

**戻り値:**

- フラット化された翻訳要求の配列

**動作:**

- ネストした配列をフラット化
- 重複は除去しない（後段で処理）

**使用例:**

```typescript
const requirements = mergeRequirements(
  childComponent1Translations,
  childComponent2Translations,
  { keys: ["title"], namespace: "page" }
);
```

### 5.2 翻訳の抽出・解決

#### 5.2.1 pickMessages

```typescript
function pickMessages(
  allMessages: TranslationFile,
  requirements: TranslationRequirement[]
): Messages;
```

**目的:** 翻訳ファイルから必要な翻訳のみを抽出

**引数:**

- `allMessages`: 全翻訳データを含むオブジェクト
- `requirements`: 必要な翻訳キーのリスト

**戻り値:**

- `Messages` オブジェクト（キー形式: `"namespace.key"`）

**動作:**

1. 各 `TranslationRequirement` を処理
2. 指定された `namespace` から `keys` に該当する翻訳を取得
3. ネストしたキー（ドット記法）にも対応
4. **複数形キーの自動解決**: 基本キー（例: `"itemCount"`）が指定された場合、`_one`, `_other` サフィックス付きキーも自動的に抽出（Intl.PluralRules ベース）
5. 見つからないキーは警告をログ出力（開発環境のみ）
6. `"namespace.key"` 形式で `Messages` オブジェクトに格納

**複数形キーの解決例:**

```typescript
// 入力
requirements = [{
  keys: ['itemCount'],
  namespace: 'common'
}];

// 出力 Messages
{
  'common.itemCount_one': '1件のアイテム',
  'common.itemCount_other': '{{count}}件のアイテム'
}
```

**エラーハンドリング:**

- キーが見つからない場合: キー自体を値として返す（フォールバック）
- 名前空間が存在しない場合: 警告ログ + フォールバック
- `_other` サフィックスが存在しない場合: 警告ログ + 基本キーをフォールバック

### 5.3 翻訳関数の生成

#### 5.3. 1 createTranslator

```typescript
function createTranslator(
  messages: Messages,
  namespace: string
): TranslatorFunction;

type TranslatorFunction = (key: string, values?: PlaceholderValues) => string;
```

**目的:** 特定の名前空間に紐づいた翻訳関数を生成

**引数:**

- `messages`: `Messages` オブジェクト
- `namespace`: 翻訳の名前空間

**戻り値:**

- 翻訳関数（`TranslatorFunction`）

**翻訳関数の動作:**

1. `values` に `count` プロパティが含まれているかチェック
2. `count` が存在する場合、Intl.PluralRules を使用して適切なキーを選択
3. 選択されたキーで `namespace.key` 形式でメッセージを取得
4. `values` が提供されている場合、プレースホルダーの置換
5. 処理済み文字列を返す

**複数形の使用例:**

```typescript
const t = createTranslator(messages, "common");

t("itemCount", { count: 0 }); // "0件のアイテム" (Intl.PluralRules で "other" が選択される)
t("itemCount", { count: 1 }); // "1件のアイテム" (Intl.PluralRules で "one" が選択される)
t("itemCount", { count: 5 }); // "5件のアイテム" (Intl.PluralRules で "other" が選択される)
```

**フォールバック:**

- メッセージが見つからない場合: `key` をそのまま返す
- 複数形キーが見つからない場合: `_other` にフォールバック、それもなければ基本キーを返す

## 6. 内部処理仕様

### 6.1 ネストキーの解決

#### 6.1. 1 getNestedValue

```typescript
function getNestedValue(
  obj: Record<string, unknown>,
  key: string
): string | undefined;
```

**目的:** フラット構造のオブジェクトから値を取得

**引数:**

- `obj`: 検索対象のオブジェクト
- `key`: キー（フラット構造でドット記法を含む可能性がある、例: `"profile.name"`）

**戻り値:**

- 見つかった文字列、または `undefined`

**動作:**

- キーで直接オブジェクトから値を取得
- 値が文字列の場合は返す
- 見つからない場合は `undefined` を返す

### 6.2 プレースホルダー置換

#### 6.2.1 replacePlaceholders

```typescript
function replacePlaceholders(
  message: string,
  values: PlaceholderValues
): string;
```

**目的:** メッセージ内のプレースホルダーを値で置換

**引数:**

- `message`: プレースホルダーを含む文字列
- `values`: 置換する値のオブジェクト

**戻り値:**

- 置換後の文字列

**動作:**

1. `values` の各エントリを処理
2. `{{placeholderName}}` を対応する値で置換
3. 値は文字列に変換（`String(value)`）
4. 同一プレースホルダーが複数ある場合、すべて置換（グローバル置換）

**仕様:**

- プレースホルダー形式: `{{name}}` （二重波括弧で囲む）
- 大文字小文字を区別
- 存在しないプレースホルダーはそのまま残す

### 6.3 複数形処理

#### 6.3. 1 selectPluralKey

```typescript
function selectPluralKey(baseKey: string, count: number, locale: string): string;
```

**目的:** Intl.PluralRules を使用して適切な複数形キーのサフィックスを選択

**引数:**

- `baseKey`: 基本キー名（例: `"itemCount"`）
- `count`: 判定する数値
- `locale`: ロケール（例: `"en"`, `"ja"`）

**戻り値:**

- サフィックス付きキー（例: `"itemCount_one"`, `"itemCount_other"`）

**選択ロジック:**

```typescript
const pluralRules = new Intl.PluralRules(locale);
const rule = pluralRules.select(count); // "one", "other" など
return `${baseKey}_${rule}`;
```

#### 6.3.2 resolvePluralMessage

```typescript
function resolvePluralMessage(
  messages: Messages,
  namespace: string,
  baseKey: string,
  count: number,
  locale: string
): string | undefined;
```

**目的:** Intl.PluralRules に基づいてメッセージを解決

**引数:**

- `messages`: `Messages` オブジェクト
- `namespace`: 名前空間
- `baseKey`: 基本キー
- `count`: 数値
- `locale`: ロケール

**戻り値:**

- 解決されたメッセージ、または `undefined`

**動作:**

1. `selectPluralKey` で Intl.PluralRules を使用して適切なキーを選択
2. `namespace.selectedKey` 形式でメッセージを取得
3. 見つからない場合、`_other` にフォールバック
4. `_other` も見つからない場合は `undefined` を返す

**フォールバックチェーン:**

```
選択されたフォーム（例: _one） → _other → undefined
```

#### 6.3.3 extractPluralKeys

```typescript
function extractPluralKeys(
  allMessages: Record<string, any>,
  namespace: string,
  baseKey: string
): string[];
```

**目的:** 翻訳ファイルから複数形に関連するすべてのキーを抽出（`pickMessages` 内で使用）

**引数:**

- `allMessages`: 全翻訳データ
- `namespace`: 名前空間
- `baseKey`: 基本キー

**戻り値:**

- 存在する複数形キーの配列（例: `["itemCount_one", "itemCount_other"]`）

**動作:**

1. `namespace` 内で `baseKey_one`, `baseKey_other` を検索（Intl.PluralRules ベース）
2. ネストしたキー（ドット記法）にも対応
3. 存在するキーのみを配列に追加

## 7. 型安全性

### 7.1 翻訳キーの型生成

#### 7.1. 1 型生成の仕組み

TypeScript の型システムを使用して、翻訳ファイルから型を自動生成する。

```typescript
// messages/ja.json から型を生成
type TranslationKeys = NestedKeyOf<typeof import("./messages/ja.json")>;
```

#### 7.1. 2 NestedKeyOf 型

```typescript
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;
```

**目的:** ネストしたオブジェクトからドット記法のキーパスを生成

**複数形キーの扱い:**

- `_one`, `_other` サフィックス付きキーも型に含まれる
- ただし、`TranslationRequirement` では基本キーのみを指定することを推奨

**生成例:**

```typescript
// Input
{
  "common": {
    "submit": "送信",
    "itemCount_one": "1件のアイテム",
    "itemCount_other": "{{count}}件のアイテム"
  }
}

// Output type
type Keys =
  | "common"
  | "common.submit"
  | "common.itemCount_one"
  | "common.itemCount_other"
```

### 7.2 型安全な翻訳要求

#### 7.2. 1 TypedTranslationRequirement

```typescript
interface TypedTranslationRequirement<
  N extends string,
  K extends TranslationKeys
> {
  keys: readonly K[];
  namespace: N;
}
```

**複数形キーの指定:**

```typescript
// 推奨: 基本キーのみを指定
const commonTranslations: TypedTranslationRequirement<
  "common",
  "submit" | "itemCount"
> = {
  keys: ["submit", "itemCount"] as const,
  namespace: "common",
};

// 非推奨: サフィックス付きキーを明示的に指定
const verboseTranslations: TypedTranslationRequirement<
  "common",
  "itemCount_one" | "itemCount_other"
> = {
  keys: ["itemCount_one", "itemCount_other"] as const,
  namespace: "common",
};
```

### 7.3 型安全な翻訳関数

#### 7.3.1 TypedTranslator

```typescript
type TypedTranslator<N extends string> = <K extends ExtractKeys<N>>(
  key: K,
  values?: PlaceholderValues
) => string;

type ExtractKeys<N extends string> = Extract<
  TranslationKeys,
  `${N}.${string}`
> extends `${N}.${infer K}`
  ? K
  : never;
```

**目的:** 名前空間に応じて使用可能なキーを制限

**複数形の型チェック:**

```typescript
const t: TypedTranslator<"common"> = createTranslator(messages, "common");

// 基本キーで呼び出し（推奨）
t("itemCount", { count: 5 }); // OK - ライブラリが自動的に適切なサフィックスを選択

// サフィックス付きキーで直接呼び出し（非推奨だが可能）
t("itemCount_other", { count: 5 }); // OK - 明示的な指定

// 存在しないキー
t("nonexistent"); // Type Error
```

---

## 8. 使用パターン

### 8.1 コンポーネントでの翻訳定義

```typescript
// 子コンポーネント
export const componentTranslations: TranslationRequirement = {
  keys: ["title", "itemCount"] as const, // 基本キーのみ指定
  namespace: "common",
};

export default function Component({ messages }: { messages: Messages }) {
  const t = createTranslator(messages, "common");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("itemCount", { count: 5 })}</p>
    </div>
  );
}
```

### 8.2 親コンポーネントでの集約

```typescript
// 親コンポーネント
import Child1, { child1Translations } from "./Child1";
import Child2, { child2Translations } from "./Child2";

export const parentTranslations = mergeRequirements(
  { keys: ["pageTitle"], namespace: "page" },
  child1Translations,
  child2Translations
);

export default function Parent({ messages }: { messages: Messages }) {
  const t = createTranslator(messages, "page");
  return (
    <div>
      <h1>{t("pageTitle")}</h1>
      <Child1 messages={messages} />
      <Child2 messages={messages} />
    </div>
  );
}
```

### 8.3 最上位コンポーネント（サーバー）

```typescript
import { pickMessages } from "@/lib/i18n";
import Parent, { parentTranslations } from "./Parent";

export default async function Page({ params }: { params: { locale: string } }) {
  const allMessages = (await import(`@/messages/${params.locale}.json`))
    .default;
  const messages = pickMessages(allMessages, parentTranslations);

  return <Parent messages={messages} />;
}
```

### 8.4 プレースホルダーの使用

```typescript
const t = createTranslator(messages, "results");

// シンプルなプレースホルダー
t("itemsFound", { count: 5 }); // "5件取得しました"

// 複数のプレースホルダー
t("greeting", { name: "John", time: "morning" }); // "おはよう、Johnさん"
```

### 8.5 複数形の使用

**翻訳ファイル:**

```json
{
  "common": {
    "itemCount_one": "1件のアイテム",
    "itemCount_other": "{{count}}件のアイテム"
  }
}
```

**コンポーネント:**

```typescript
const t = createTranslator(messages, "common");

t("itemCount", { count: 0 }); // "0件のアイテム" (Intl.PluralRules で "other")
t("itemCount", { count: 1 }); // "1件のアイテム" (Intl.PluralRules で "one")
t("itemCount", { count: 5 }); // "5件のアイテム" (Intl.PluralRules で "other")
```

### 8.6 複数形 + プレースホルダーの組み合わせ

**翻訳ファイル:**

```json
{
  "shop": {
    "cartSummary_one": "{{user}}さんのカートに1個の商品があります",
    "cartSummary_other": "{{user}}さんのカートに{{count}}個の商品があります"
  }
}
```

**コンポーネント:**

```typescript
const t = createTranslator(messages, "shop");

t("cartSummary", { count: 0, user: "田中" });
// "田中さんのカートに0個の商品があります"

t("cartSummary", { count: 1, user: "田中" });
// "田中さんのカートに1個の商品があります"

t("cartSummary", { count: 5, user: "田中" });
// "田中さんのカートに5個の商品があります"
```

---

## 9. エラーハンドリング

### 9.1 エラーの種類と対応

| エラー種別             | 発生条件                                                | 動作                                                            | 環境           |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------- | -------------- |
| キー未定義             | 指定されたキーが翻訳ファイルに存在しない                | キー名をそのまま表示 + 警告ログ                                 | 開発のみ警告   |
| 名前空間未定義         | 指定された名前空間が存在しない                          | 警告ログ + フォールバック                                       | 開発のみ警告   |
| 複数形キー不足         | `_other` キーが存在しない                               | エラーログ + 基本キーまたは他のサフィックスキーにフォールバック | 開発のみエラー |
| プレースホルダー未提供 | メッセージにプレースホルダーがあるが値が未提供          | プレースホルダーをそのまま表示                                  | 警告なし       |
| count 未提供           | 複数形キーを使用するが`count`が`values`に含まれていない | `_other` にフォールバック + 警告ログ                            | 開発のみ警告   |

### 9.2 フォールバック戦略

1. **翻訳が見つからない場合:**

   - キー名をそのまま表示
   - 開発環境で警告を出力

2. **複数形キーが部分的に存在しない場合:**

   ```
   選択されたフォーム（例: _one）なし → _other にフォールバック
   _other なし → エラーログ + 基本キーを表示
   ```

3. **プレースホルダー置換に失敗した場合:**

   - 置換できない部分はそのまま残す
   - サイレントに処理（警告なし）

4. **count 未提供で複数形キーを使用する場合:**
   - `_other` キーを使用
   - 開発環境で警告を出力

## 10. パフォーマンス考慮事項

### 10.1 最適化戦略

1. **翻訳の事前抽出:**

   - `pickMessages` はサーバーサイドでのみ実行
   - 必要な翻訳のみをクライアントに送信
   - 複数形キーの自動抽出により、手動での指定が不要

2. **メモ化:**

   - `createTranslator` の結果をメモ化可能
   - 同じ `messages` と `namespace` の組み合わせではキャッシュを使用

3. **正規表現のキャッシュ:**

   - プレースホルダー置換の正規表現を可能な限り再利用

4. **複数形キー検索の最適化:**
   - サフィックスパターンのマッチングを効率化
   - 一度解決したキーをキャッシュ

## 11. 将来の拡張性

### 11.1 拡張候補

以下の機能は現バージョンでは実装せず、将来的な拡張として検討する：

1. **フォーマッター:**

   - 数値フォーマット
   - 日付フォーマット
   - 通貨フォーマット

2. **動的インポート:**

   - 翻訳ファイルの遅延ロード
   - コード分割対応

3. **翻訳の検証ツール:**

   - 未使用キーの検出
   - 欠損キーの検出
   - 翻訳ファイル間の整合性チェック
   - 複数形キーセットの完全性チェック（\_other の存在確認）

4. **より高度な複数形:**

   - ロケール固有の複数形ルール（few, many など）
   - 範囲指定（例: `_few` for 2-4, `_many` for 5+）
   - カスタム複数形ルール関数

5. **ロケール固有の複数形ロジック:**
   - 現在は単純な 0/1/other ルール
   - 将来的には CLDR 準拠の複数形ルールをサポート

### 11.2 拡張のための設計上の配慮

- 各関数を独立して実装し、疎結合を保つ
- 複数形サフィックスのパターンを設定可能にする余地を残す
- プラグインシステムの導入余地を残す
- 設定オブジェクトによるカスタマイズ可能性

## 12. テスト要件

### 12.1 単体テスト

各関数に対して以下をテスト：

1. **pickMessages:**

   - 単一の翻訳要求
   - 複数の翻訳要求
   - ネストしたキー
   - 存在しないキー
   - 存在しない名前空間
   - **複数形キーの自動抽出（\_one, \_other）**
   - **部分的な複数形キー（\_other のみ、など）**
   - **複数形キーとネストの組み合わせ**

2. **createTranslator:**

   - 基本的な翻訳
   - プレースホルダー置換
   - **複数形処理（count: 0, 1, 2+）**
   - **複数形 + プレースホルダーの組み合わせ**
   - 存在しないキー
   - **count なしで複数形キーを使用**

3. **replacePlaceholders:**

   - 単一プレースホルダー
   - 複数プレースホルダー
   - 同一プレースホルダーの複数使用
   - 数値の文字列変換

4. **selectPluralKey:**

   - Intl.PluralRules のテスト（異なるロケール）
   - count = 0 → ロケールに応じた結果
   - count = 1 → 通常 `_one`
   - count = 2+ → ロケールに応じた結果
   - 負の数の処理

5. **resolvePluralMessage:**

   - 完全な複数形セット（\_one, \_other）
   - \_other のみ
   - フォールバックチェーン
   - 複数形キーが全く存在しない場合

6. **extractPluralKeys:**

   - 完全な複数形セットの抽出
   - 部分的なセットの抽出
   - ネストしたキーでの複数形抽出
   - 複数形キーが存在しない場合

7. **mergeRequirements:**
   - 配列のフラット化
   - 空配列
   - ネストした配列

### 12.2 統合テスト

1. **コンポーネントでの使用:**

   - サーバーコンポーネント
   - クライアントコンポーネント
   - 汎用コンポーネント
   - **複数形を使用するコンポーネント**

2. **エンドツーエンド:**
   - 翻訳ファイルの読み込み
   - 翻訳要求の集約
   - **複数形キーを含むメッセージの抽出**
   - コンポーネントでの表示
   - **動的な count 値での複数形表示**

### 12.3 型テスト

TypeScript の型チェックが正しく機能することを確認：

1. 型安全な翻訳キー
2. 名前空間の制約
3. 不正なキーでのコンパイルエラー
4. **複数形キー（基本キーとサフィックス付きキー）の型チェック**

### 12.4 エッジケーステスト

1. **複数形の境界値:**

   - count = -1（負の数）
   - count = 0. 5（小数）
   - count = NaN
   - count = Infinity

2. **キー命名の衝突:**
   - `item` と `item_one` が両方存在する場合
   - `item_other_thing` のような紛らわしいキー名

---

## 13. ドキュメント要件

### 13.1 必須ドキュメント

1. **README.md:**

   - クイックスタート
   - 基本的な使用例
   - **複数形の使用方法（react-i18next 互換）**
   - インストール方法

2. **API Reference:**
   - 全関数の詳細仕様
   - 型定義
   - 使用例
   - **複数形キーのサフィックス規則**

### 13.2 コード内ドキュメント

- すべての公開関数に JSDoc コメント
- 複雑なロジックにはインラインコメント
- 型定義に説明コメント
- **複数形処理ロジックに詳細なコメント**
