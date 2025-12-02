# colocale

Next.js App Router で使える、サーバー・クライアントコンポーネント両対応の軽量 i18n ライブラリです。

GraphQL の fragment collocation パターンを応用し、各コンポーネントが必要な翻訳キーを宣言的に定義できます。

## 特徴

- 🎯 **Colocation**: 翻訳キーの定義をコンポーネントと同じ場所に配置
- 🔒 **型安全**: TypeScript による完全な型サポート
- 📦 **軽量**: 依存関係なし、シンプルな API
- 🌐 **複数形対応**: react-i18next 互換の複数形処理
- ⚡ **高速**: 必要な翻訳のみを抽出してクライアントに送信
- 🔄 **両対応**: サーバー・クライアントコンポーネントの両方で動作

## インストール

```bash
npm install colocale
# or
bun add colocale
```

## CLI ツール

`colocale` は 2 つのサブコマンドを提供します：

```bash
# ヘルプを表示
npx colocale --help

# 翻訳ファイルの検証
npx colocale check messages/ja          # 単一ロケール
npx colocale check messages              # 全ロケール + 整合性チェック

# 型定義の生成
npx colocale codegen messages/en types/messages.d.ts
```

## クイックスタート

### 1. 翻訳ファイルを作成

名前空間ごとに JSON ファイルを作成します。

```json
// messages/ja/common.json
{
  "submit": "送信",
  "cancel": "キャンセル",
  "itemCount_zero": "アイテムがありません",
  "itemCount_one": "1件のアイテム",
  "itemCount_other": "{count}件のアイテム"
}
```

```json
// messages/ja/user.json
{
  "profile": {
    "name": "名前",
    "email": "メールアドレス"
  }
}
```

### 2. 型定義を生成（推奨）

```bash
npx colocale codegen messages/en types/messages.d.ts
```

これにより、翻訳ファイルから TypeScript の型定義が自動生成されます。

### 3. コンポーネントで翻訳を定義

```typescript
// components/UserProfile.tsx
import {
  createTranslator,
  type TranslationRequirement,
  type Messages,
} from "colocale";
import type { TranslationKey } from "@/types/messages";

// このコンポーネントが必要な翻訳キーを定義（型安全）
export const userProfileTranslations: TranslationRequirement<
  "user",
  TranslationKey<"user">
> = {
  keys: ["profile.name", "profile.email"] as const,
  namespace: "user",
};

export default function UserProfile({ messages }: { messages: Messages }) {
  const t = createTranslator<"user", TranslationKey<"user">>(messages, "user");

  return (
    <div>
      <label>{t("profile.name")}</label>
      <label>{t("profile.email")}</label>
    </div>
  );
}
```

### 4. 親コンポーネントで翻訳要求を集約

```typescript
// components/UserPage.tsx
import {
  mergeRequirements,
  createTranslator,
  type TranslationRequirement,
  type Messages,
} from "colocale";
import type { TranslationKey } from "@/types/messages";
import UserProfile, { userProfileTranslations } from "./UserProfile";

export const userPageTranslations = mergeRequirements(
  {
    keys: ["submit", "cancel"],
    namespace: "common",
  } satisfies TranslationRequirement<"common", TranslationKey<"common">>,
  userProfileTranslations
);

export default function UserPage({ messages }: { messages: Messages }) {
  const t = createTranslator<"common", TranslationKey<"common">>(
    messages,
    "common"
  );

  return (
    <div>
      <UserProfile messages={messages} />
      <button>{t("submit")}</button>
      <button>{t("cancel")}</button>
    </div>
  );
}
```

### 5. サーバーコンポーネントで翻訳を抽出

```typescript
// app/[locale]/users/page.tsx
import { pickMessages } from "colocale";
import type { TranslationStructure } from "@/types/messages";
import UserPage, { userPageTranslations } from "@/components/UserPage";

export default async function Page({ params }: { params: { locale: string } }) {
  // 動的インポートで必要なロケールの翻訳のみロード（型安全）
  const allMessages: TranslationStructure = {
    common: (await import(`@/messages/${params.locale}/common.json`)).default,
    user: (await import(`@/messages/${params.locale}/user.json`)).default,
  };

  // 必要な翻訳のみを抽出
  const messages = pickMessages(allMessages, userPageTranslations);

  return <UserPage messages={messages} />;
}
```

## API リファレンス

### pickMessages

翻訳ファイルから必要な翻訳のみを抽出します。

```typescript
function pickMessages(
  allMessages: TranslationFile,
  requirements: TranslationRequirement[]
): Messages;
```

**複数形の自動抽出**: 基本キー（例: `"itemCount"`）を指定すると、`_zero`, `_one`, `_other` サフィックス付きキーも自動的に抽出されます。

### createTranslator

特定の名前空間に紐づいた翻訳関数を生成します。

```typescript
function createTranslator(
  messages: Messages,
  namespace: string
): (key: string, values?: PlaceholderValues) => string;
```

### mergeRequirements

複数の翻訳要求を 1 つの配列にマージします。

```typescript
function mergeRequirements(
  ...requirements: (TranslationRequirement | TranslationRequirement[])[]
): TranslationRequirement[];
```

## 使用例

### プレースホルダー

```typescript
const t = createTranslator(messages, "results");

t("itemsFound", { count: 5 }); // "5件取得しました"
t("greeting", { name: "田中" }); // "こんにちは、田中さん"
```

### 複数形（Pluralization）

**翻訳ファイル:**

```json
{
  "common": {
    "itemCount_zero": "アイテムがありません",
    "itemCount_one": "1件のアイテム",
    "itemCount_other": "{count}件のアイテム"
  }
}
```

**コンポーネント:**

```typescript
// 翻訳要求では基本キーのみを指定
export const translations: TranslationRequirement = {
  keys: ["itemCount"], // _zero, _one, _other は自動的に抽出される
  namespace: "common",
};

const t = createTranslator(messages, "common");

t("itemCount", { count: 0 }); // "アイテムがありません"
t("itemCount", { count: 1 }); // "1件のアイテム"
t("itemCount", { count: 5 }); // "5件のアイテム"
```

**複数形のルール（react-i18next 互換）:**

- `count === 0` → `{key}_zero`（なければ `_other` を使用）
- `count === 1` → `{key}_one`（必須）
- その他 → `{key}_other`（必須）

**注意:** `_one` と `_other` は必須です。これらが存在しない場合、基本キー（サフィックスなし）があればそれが使用されますが、複数形として正しく機能しません。`_zero` のみオプションで、省略すると `count === 0` の場合に `_other` が使用されます。

### 複数形 + プレースホルダー

```json
{
  "shop": {
    "cartSummary_zero": "{user}さんのカートは空です",
    "cartSummary_one": "{user}さんのカートに1個の商品があります",
    "cartSummary_other": "{user}さんのカートに{count}個の商品があります"
  }
}
```

```typescript
const t = createTranslator(messages, "shop");

t("cartSummary", { count: 0, user: "田中" });
// "田中さんのカートは空です"

t("cartSummary", { count: 5, user: "田中" });
// "田中さんのカートに5個の商品があります"
```

### ネストしたキー

```json
{
  "user": {
    "profile": {
      "name": "名前",
      "email": "メールアドレス"
    }
  }
}
```

```typescript
const t = createTranslator(messages, "user");

t("profile.name"); // "名前"
t("profile.email"); // "メールアドレス"
```

## 翻訳ファイルの検証

翻訳ファイルが正しい形式になっているかをチェックするコマンドが用意されています。

```bash
# 翻訳ファイルのバリデーション
npx colocale check messages/ja          # 単一ロケール
npx colocale check messages              # 全ロケール + 整合性チェック

# 型定義の生成
npx colocale codegen messages/en types/messages.d.ts
```

### コマンドラインから実行

```bash
# 単一ロケールをチェック
npx colocale check messages/ja

# 複数のロケールを個別にチェック
npx colocale check messages/ja messages/en

# 複数ロケールを一括チェック（locale間の整合性も検証）
npx colocale check messages
```

### locale 間の整合性チェック

複数のロケールが存在する場合、各ロケールの同じ namespace が同じキーを持っているかをチェックします。

**ディレクトリ構造:**

```
messages/
  en/
    common.json
    user.json
  ja/
    common.json
    user.json
```

**コマンド実行:**

```bash
npx colocale check messages
```

**出力例:**

```
🔍 Checking translation files...

📁 Found 2 locale(s)

📁 en
  ✅ No errors

📁 ja
  ✅ No errors

==================================================
🌐 Cross-locale consistency check

📁 Cross-locale

  ❌ Errors (2):
     • [common] [ja ← en] cancel
       Key "cancel" exists in "en" but missing in "ja"
     • [user] [en ← ja] profile.email
       Key "profile.email" exists in "ja" but not in "en"

==================================================
❌ Validation failed: Errors found
```

### プログラムから実行

```typescript
import { validateTranslations, validateCrossLocale } from "colocale";
import type { LocaleTranslations } from "colocale/cli/loader";

// 単一ロケールの検証
const translations = {
  common: {
    itemCount_one: "1件のアイテム",
    // itemCount_other が不足している場合、エラーになる
  },
};

const result = validateTranslations(translations);

if (!result.valid) {
  console.error("翻訳ファイルにエラーがあります:");
  for (const error of result.errors) {
    console.error(`  [${error.namespace}] ${error.key}: ${error.message}`);
  }
}

// locale間の整合性検証
const localeTranslations: LocaleTranslations = {
  en: {
    common: { submit: "Submit", cancel: "Cancel" },
  },
  ja: {
    common: { submit: "送信" }, // "cancel" が不足
  },
};

const crossLocaleResult = validateCrossLocale(localeTranslations);

if (!crossLocaleResult.valid) {
  console.error("locale間で不整合があります:");
  for (const error of crossLocaleResult.errors) {
    console.error(
      `  [${error.namespace}] ${error.locale} ← ${error.referenceLocale}: ${error.key}`
    );
    console.error(`    ${error.message}`);
  }
}
```

### 検証内容

#### 各ロケールの検証

- **複数形キーの整合性**: `_one` と `_other` が必須（`_zero` はオプション）
- **ネストの深さ**: 1 階層まで許可
- **キーの命名規則**: 英数字とアンダースコアのみ使用可能
- **プレースホルダーの形式**: `{name}` 形式で、名前は英数字とアンダースコアのみ

#### locale 間の整合性検証

- **キーの一致**: 同じ namespace を持つファイル間で、すべてのキーが一致しているか
- **欠損キーの検出**: 参照ロケール（最初のロケール）に存在するキーが他のロケールに存在するか
- **追加キーの検出**: 他のロケールにのみ存在し、参照ロケールに存在しないキー

### CI/CD での使用例

```yaml
# .github/workflows/check-translations.yml
name: Check Translations

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      # locale間の整合性もチェック
      - run: npx colocale check messages
```

## 型安全性

### 型定義の自動生成

JSON ファイルから TypeScript の型定義を自動生成できます。これにより、`allMessages` や翻訳キーに完全な型安全性を提供できます。

```bash
# 型定義ファイルを生成
npx colocale codegen messages/en types/messages.d.ts
```

**生成される型定義の例:**

```typescript
// types/messages.d.ts
export interface TranslationStructure {
  common: {
    submit: string;
    cancel: string;
    itemCount: string;
  };
  user: {
    profile: {
      name: string;
      email: string;
    };
  };
}

export type TranslationKey<N extends keyof TranslationStructure> =
  N extends "common"
    ? "submit" | "cancel" | "itemCount"
    : N extends "user"
    ? "profile.name" | "profile.email"
    : never;
```

**型定義を使用する:**

```typescript
import type { TranslationStructure, TranslationKey } from "./types/messages";
import {
  createTranslator,
  type Messages,
  type TranslationRequirement,
} from "colocale";

// allMessages に型を適用
const allMessages: TranslationStructure = {
  common: (await import(`@/messages/${locale}/common.json`)).default,
  user: (await import(`@/messages/${locale}/user.json`)).default,
};

// 翻訳要求に型を適用
export const userProfileTranslations: TranslationRequirement<
  "user",
  TranslationKey<"user">
> = {
  keys: ["profile.name", "profile.email"] as const,
  namespace: "user",
};

// createTranslator も型安全に
const t = createTranslator<"user", TranslationKey<"user">>(messages, "user");

t("profile.name"); // ✅ 型チェックが通る
t("profile.invalid"); // ❌ コンパイルエラー
```

### 開発ワークフロー

1. **翻訳ファイルを更新**
2. **型定義を再生成**: `npx colocale codegen messages/en types/messages.d.ts`
3. **型安全性の恩恵を受ける**: コンパイル時に存在しないキーを検出

### package.json スクリプトに追加

```json
{
  "scripts": {
    "check": "colocale check messages",
    "codegen": "colocale codegen messages/en types/messages.d.ts",
    "codegen:watch": "nodemon --watch messages --ext json --exec 'npm run codegen'"
  }
}
```

## ライセンス

MIT
