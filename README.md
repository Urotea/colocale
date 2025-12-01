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

### 2. コンポーネントで翻訳を定義

```typescript
// components/UserProfile.tsx
import {
  createTranslator,
  type TranslationRequirement,
  type Messages,
} from "colocale";

// このコンポーネントが必要な翻訳キーを定義
export const userProfileTranslations: TranslationRequirement = {
  keys: ["profile.name", "profile.email"] as const,
  namespace: "user",
};

export default function UserProfile({ messages }: { messages: Messages }) {
  const t = createTranslator(messages, "user");

  return (
    <div>
      <label>{t("profile.name")}</label>
      <label>{t("profile.email")}</label>
    </div>
  );
}
```

### 3. 親コンポーネントで翻訳要求を集約

```typescript
// components/UserPage.tsx
import {
  mergeRequirements,
  createTranslator,
  type TranslationRequirement,
  type Messages,
} from "colocale";
import UserProfile, { userProfileTranslations } from "./UserProfile";

export const userPageTranslations = mergeRequirements(
  { keys: ["submit", "cancel"], namespace: "common" },
  userProfileTranslations
);

export default function UserPage({ messages }: { messages: Messages }) {
  const t = createTranslator(messages, "common");

  return (
    <div>
      <UserProfile messages={messages} />
      <button>{t("submit")}</button>
      <button>{t("cancel")}</button>
    </div>
  );
}
```

### 4. サーバーコンポーネントで翻訳を抽出

```typescript
// app/[locale]/users/page.tsx
import { pickMessages } from "colocale";
import UserPage, { userPageTranslations } from "@/components/UserPage";

export default async function Page({ params }: { params: { locale: string } }) {
  // 動的インポートで必要なロケールの翻訳のみロード
  const allMessages = {
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

### コマンドラインから実行

```bash
# ローカルで開発時
bun run check messages/ja

# 複数のロケールをチェック
bun run check messages/ja messages/en

# パッケージをインストールした後
npx colocale-check messages/ja
```

### プログラムから実行

```typescript
import { validateTranslations } from "colocale";

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
```

### 検証内容

- **複数形キーの整合性**: `_one` と `_other` が必須（`_zero` はオプション）
- **ネストの深さ**: 1 階層まで許可
- **キーの命名規則**: 英数字とアンダースコアのみ使用可能
- **プレースホルダーの形式**: `{name}` 形式で、名前は英数字とアンダースコアのみ

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
      - run: bun run check messages/*
```

## 型安全性

TypeScript の型システムを活用して、翻訳キーの型安全性を確保できます。

```typescript
import type { NestedKeyOf } from "colocale";

// 翻訳ファイルから型を生成
type TranslationKeys = NestedKeyOf<typeof import("./messages/ja.json")>;

// 型安全な翻訳要求
const translations: TypedTranslationRequirement<"common", TranslationKeys> = {
  keys: ["submit", "cancel"] as const,
  namespace: "common",
};
```

## Development

```bash
# Install dependencies
bun install

# Run in development mode (with watch)
bun dev

# Run once
bun start

# Build
bun build

# Type check
bun typecheck

# Test
bun test
```

## Requirements

- Bun (latest)
- TypeScript 5.7+

## ライセンス

MIT

## 関連リンク

- [仕様書 (spec.md)](./spec.md)
