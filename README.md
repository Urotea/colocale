# colocale

A lightweight i18n library that supports both server and client components.

Inspired by GraphQL's fragment collocation pattern, each component can declaratively define the translation keys it needs. While it works great with Next.js App Router, it's framework-agnostic and can be used in any React application.

## Features

- 🎯 **Colocation**: Define translation keys alongside your components
- 🔒 **Type-safe**: Full TypeScript support with auto-generated types
- 📦 **Lightweight**: Zero dependencies, simple API
- 🌐 **Pluralization**: react-i18next compatible plural handling
- ⚡ **Fast**: Extract and send only the translations needed by components
- 🔄 **Universal**: Works in both server and client components

## Installation

```bash
npm install colocale
# or
bun add colocale
```

**Note:** If you want to use the `codegen` command to generate TypeScript types, you'll need TypeScript installed in your project:

```bash
npm install -D typescript
# or
bun add -d typescript
```

## CLI Tools

`colocale` provides 2 subcommands:

```bash
# Show help
npx colocale --help

# Validate translation files
npx colocale check messages/ja          # Single locale
npx colocale check messages              # All locales + consistency check

# Generate type definitions
npx colocale codegen messages types/messages.d.ts
```

## Quick Start

### 1. Create Translation Files

Create JSON files for each namespace.

```json
// messages/en/common.json
{
  "submit": "Submit",
  "cancel": "Cancel",
  "itemCount_zero": "No items",
  "itemCount_one": "1 item",
  "itemCount_other": "{{count}} items"
}
```

```json
// messages/en/user.json
{
  "profile": {
    "name": "Name",
    "email": "Email"
  }
}
```

### 2. Generate Type Definitions (Recommended)

```bash
npx colocale codegen messages types/messages.d.ts
```

This automatically generates TypeScript type definitions from your translation files.

### 3. Separate Translation Requirements from Components (Best Practice)

When using colocale with Next.js App Router, separate translation requirements from component files to avoid bundler issues with the Server/Client Component boundary.

**Create a separate `translations.ts` file** (without `'use client'`):

```typescript
// app/users/translations.ts
import { defineRequirement, mergeRequirements } from "colocale";
import type { TranslationStructure } from "@/types/messages";

// Component-specific translation requirements with type safety
export const userProfileTranslations = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);

export const commonTranslations = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

// Page-level merged requirements
export const userPageTranslations = mergeRequirements(
  commonTranslations,
  userProfileTranslations
);
```

**Note:** While type parameters can be inferred, explicitly providing them (as shown above) ensures compile-time validation that namespaces and keys exist in your translation files.

**Use in Client Component:**

```typescript
// components/UserProfile.tsx
"use client";
import { createTranslator, type Messages } from "colocale";
import { userProfileTranslations } from "../app/users/translations";

export default function UserProfile({ messages }: { messages: Messages }) {
  const t = createTranslator(messages, userProfileTranslations);
  return (
    <div>
      <label>{t("profile.name")}</label>
      <label>{t("profile.email")}</label>
    </div>
  );
}
```

**⚠️ Why separate files?** If you export translation requirements from a Client Component (with `'use client'`), Next.js's bundler creates proxy functions instead of the actual values, breaking `mergeRequirements` and type safety. See [Best Practices](#best-practices-for-nextjs-app-router) for details.

### 4. Aggregate Translation Requirements

```typescript
// app/users/UserPage.tsx (can be Server or Client Component)
import { createTranslator, type Messages } from "colocale";
import { commonTranslations, userPageTranslations } from "./translations";
import UserProfile from "@/components/UserProfile";

export default function UserPage({ messages }: { messages: Messages }) {
  const t = createTranslator(messages, commonTranslations);

  return (
    <div>
      <UserProfile messages={messages} />
      <button>{t("submit")}</button>
      <button>{t("cancel")}</button>
    </div>
  );
}
```

### 5. Extract Translations in Server Components

```typescript
// app/[locale]/users/page.tsx
import { pickMessages } from "colocale";
import type { TranslationStructure } from "@/types/messages";
import { userPageTranslations } from "./translations";
import UserPage from "./UserPage";

export default async function Page({ params }: { params: { locale: string } }) {
  // Dynamically import only the needed locale's translations (type-safe)
  const allMessages: TranslationStructure = {
    common: (await import(`@/messages/${params.locale}/common.json`)).default,
    user: (await import(`@/messages/${params.locale}/user.json`)).default,
  };

  // Extract only the needed translations
  const messages = pickMessages(allMessages, userPageTranslations);

  return <UserPage messages={messages} />;
}
```

### Benefits of This Pattern

1. **Avoids Next.js bundler issues**: Translation requirements remain as plain objects, not proxy functions
2. **Better collocation**: All translation requirements for a feature/page are in one place
3. **Type safety maintained**: TypeScript inference works correctly across Server/Client boundaries
4. **Cleaner imports**: Single source of truth for translation requirements
5. **Clear separation of concerns**: Translation requirements are separate from component logic

### Key Takeaways

- ✅ **DO** create a separate `translations.ts` file (without `'use client'`) for translation requirements
- ✅ **DO** import translation requirements from this shared file in both Server and Client Components
- ✅ **DO** colocate `translations.ts` with the components that use them (e.g., per page or feature folder)
- ❌ **DON'T** export translation requirements from files with `'use client'` directive
- ❌ **DON'T** define translation requirements inside Client Components if they need to be used in Server Components

## API Reference

### pickMessages

Extracts only the needed translations from translation files.

```typescript
function pickMessages(
  allMessages: TranslationFile,
  requirements: TranslationRequirement[]
): Messages;
```

**Automatic plural extraction**: When you specify a base key (e.g., `"itemCount"`), keys with `_zero`, `_one`, `_other` suffixes are automatically extracted.

### createTranslator

Creates a translation function bound to a specific namespace from a TranslationRequirement.

```typescript
function createTranslator<R extends TranslationRequirement<string>>(
  messages: Messages,
  requirement: R
): ConstrainedTranslatorFunction<R>;
```

**Key constraint**: The returned translator function is constrained to only accept keys defined in the `TranslationRequirement`.

### mergeRequirements

Merges multiple translation requirements into a single array.

```typescript
function mergeRequirements(
  ...requirements: TranslationRequirement<string>[]
): TranslationRequirement<string>[];
```

### defineRequirement

Helper function to create a TranslationRequirement with compile-time type validation.

```typescript
function defineRequirement<
  T,
  N extends Namespace<T>,
  const K extends readonly KeysForNamespace<T, N>[]
>(namespace: N, keys: K): TranslationRequirement<K>;
```

**Type Safety:**

When you provide the `TranslationStructure` type parameter, `defineRequirement` validates that:

- The namespace exists in your translation structure
- All keys are valid for that namespace
- Nested keys use correct dot notation

**Without type parameter (still works, but no compile-time validation):**

```typescript
// Type parameters are inferred, but no validation against actual translation structure
const req = defineRequirement("common", ["submit", "cancel"]);
```

**With type parameter (recommended - full type safety):**

```typescript
import type { TranslationStructure } from "./types/messages";

// ✅ Valid - both namespace and keys exist
const req = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

// ❌ Compile error - namespace doesn't exist
const req = defineRequirement<TranslationStructure, "invalid", ["key"]>(
  "invalid",
  ["key"]
);

// ❌ Compile error - key doesn't exist in namespace
const req = defineRequirement<TranslationStructure, "common", ["invalid"]>(
  "common",
  ["invalid"]
);
```

**Best Practice:**

To maximize type safety while keeping the code clean, generate types with `codegen` and use them consistently:

```typescript
import type { TranslationStructure } from "@/types/messages";

// Explicit type parameters ensure compile-time validation
export const commonTranslations = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

export const userProfileTranslations = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);
```

## Usage Examples

### Placeholders

```typescript
import { defineRequirement, createTranslator } from "colocale";
import type { TranslationStructure } from "@/types/messages";

const resultsReq = defineRequirement<
  TranslationStructure,
  "results",
  ["itemsFound", "greeting"]
>("results", ["itemsFound", "greeting"]);
const t = createTranslator(messages, resultsReq);

t("itemsFound", { count: 5 }); // "Found 5 items"
t("greeting", { name: "John" }); // "Hello, John"
```

### Pluralization

**Translation file:**

```json
{
  "common": {
    "itemCount_zero": "No items",
    "itemCount_one": "1 item",
    "itemCount_other": "{{count}} items"
  }
}
```

**Component:**

```typescript
import { defineRequirement, createTranslator } from "colocale";
import type { TranslationStructure } from "@/types/messages";

// Specify only the base key in translation requirements
export const translations = defineRequirement<
  TranslationStructure,
  "common",
  ["itemCount"]
>("common", [
  "itemCount", // _zero, _one, _other are automatically extracted
]);

const t = createTranslator(messages, translations);

t("itemCount", { count: 0 }); // "No items"
t("itemCount", { count: 1 }); // "1 item"
t("itemCount", { count: 5 }); // "5 items"
```

**Pluralization rules (react-i18next compatible):**

- `count === 0` → `{key}_zero` (falls back to `_other` if not present)
- `count === 1` → `{key}_one` (required)
- Otherwise → `{key}_other` (required)

**Note:** `_one` and `_other` are required. If they don't exist, the base key (without suffix) will be used if available, but it won't function correctly as a plural. Only `_zero` is optional; if omitted, `_other` is used when `count === 0`.

### Pluralization + Placeholders

```json
{
  "shop": {
    "cartSummary_zero": "{{user}}'s cart is empty",
    "cartSummary_one": "{{user}} has 1 item in cart",
    "cartSummary_other": "{{user}} has {{count}} items in cart"
  }
}
```

```typescript
import { defineRequirement, createTranslator } from "colocale";
import type { TranslationStructure } from "@/types/messages";

const shopReq = defineRequirement<
  TranslationStructure,
  "shop",
  ["cartSummary"]
>("shop", ["cartSummary"]);
const t = createTranslator(messages, shopReq);

t("cartSummary", { count: 0, user: "John" });
// "John's cart is empty"

t("cartSummary", { count: 5, user: "John" });
// "John has 5 items in cart"
```

### Nested Keys

```json
{
  "user": {
    "profile": {
      "name": "Name",
      "email": "Email"
    }
  }
}
```

```typescript
import { defineRequirement, createTranslator } from "colocale";
import type { TranslationStructure } from "@/types/messages";

const userReq = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);
const t = createTranslator(messages, userReq);

t("profile.name"); // "Name"
t("profile.email"); // "Email"
```

## Translation File Validation

Commands are provided to check if translation files are in the correct format.

```bash
# Validate translation files
npx colocale check messages/ja          # Single locale
npx colocale check messages              # All locales + consistency check

# Generate type definitions
npx colocale codegen messages/en types/messages.d.ts
```

### Running from Command Line

```bash
# Check a single locale
npx colocale check messages/ja

# Check multiple locales individually
npx colocale check messages/ja messages/en

# Check multiple locales at once (validates cross-locale consistency)
npx colocale check messages
```

### Cross-Locale Consistency Check

When multiple locales exist, checks if each locale's same namespace has the same keys.

**Directory structure:**

```
messages/
  en/
    common.json
    user.json
  ja/
    common.json
    user.json
```

**Run command:**

```bash
npx colocale check messages
```

**Output example:**

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

### Running from Code

```typescript
import { validateTranslations, validateCrossLocale } from "colocale";
import type { LocaleTranslations } from "colocale";

// Validate a single locale
const translations = {
  common: {
    itemCount_one: "1 item",
    // Missing itemCount_other will cause an error
  },
};

const result = validateTranslations(translations);

if (!result.valid) {
  console.error("Translation file has errors:");
  for (const error of result.errors) {
    console.error(`  [${error.namespace}] ${error.key}: ${error.message}`);
  }
}

// Cross-locale consistency validation
const localeTranslations: LocaleTranslations = {
  en: {
    common: { submit: "Submit", cancel: "Cancel" },
  },
  ja: {
    common: { submit: "送信" }, // Missing "cancel"
  },
};

const crossLocaleResult = validateCrossLocale(localeTranslations);

if (!crossLocaleResult.valid) {
  console.error("Cross-locale inconsistencies found:");
  for (const error of crossLocaleResult.errors) {
    console.error(
      `  [${error.namespace}] ${error.locale} ← ${error.referenceLocale}: ${error.key}`
    );
    console.error(`    ${error.message}`);
  }
}
```

### Validation Contents

#### Per-Locale Validation

- **Plural key consistency**: `_one` and `_other` are required (`_zero` is optional)
- **Nesting depth**: Up to 1 level allowed
- **Key naming rules**: Only alphanumeric characters and underscores
- **Placeholder format**: `{{name}}` format, with alphanumeric characters and underscores only

#### Cross-Locale Consistency Validation

- **Key matching**: All keys must match between files with the same namespace
- **Missing key detection**: Keys that exist in the reference locale (first locale) must exist in other locales
- **Extra key detection**: Keys that exist only in other locales but not in the reference locale

### CI/CD Usage Example

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
      # Also check cross-locale consistency
      - run: npx colocale check messages
```

## Type Safety

### Auto-Generate Type Definitions

You can automatically generate TypeScript type definitions from JSON files. This provides complete type safety for `allMessages` and translation keys.

```bash
# Generate type definition file
npx colocale codegen messages types/messages.d.ts
```

**Example of generated type definitions:**

```typescript
// types/messages.d.ts
/**
 * Auto-generated translation types
 * DO NOT EDIT MANUALLY
 */

export interface CommonMessages {
  submit: string;
  cancel: string;
  itemCount_one: string;
  itemCount_other: string;
}

export interface UserProfile {
  name: string;
  email: string;
}

export interface UserMessages {
  profile: UserProfile;
}

export interface TranslationStructure {
  common: CommonMessages;
  user: UserMessages;
}

/**
 * Union type of all translation keys
 */
export type TranslationKey<N extends keyof TranslationStructure> =
  N extends "common"
    ? "submit" | "cancel" | "itemCount_one" | "itemCount_other"
    : N extends "user"
    ? "profile.name" | "profile.email"
    : never;
```

**Using the type definitions:**

```typescript
import type { TranslationStructure, TranslationKey } from "./types/messages";
import { createTranslator, defineRequirement, type Messages } from "colocale";

// Apply types to allMessages
const allMessages: TranslationStructure = {
  common: (await import(`@/messages/${locale}/common.json`)).default,
  user: (await import(`@/messages/${locale}/user.json`)).default,
};

// defineRequirement with type safety - validates namespace and keys at compile time
export const userProfileTranslations = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);

// createTranslator is type-safe and constrained to the requirement keys
const t = createTranslator(messages, userProfileTranslations);

t("profile.name"); // ✅ Type checks pass
t("profile.email"); // ✅ Type checks pass
t("profile.invalid"); // ❌ Compile error - not in requirement keys
```

**Type parameter benefits:**

```typescript
// ✅ Valid - namespace and keys exist
const validReq = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

// ❌ Compile error - namespace doesn't exist
const invalidNamespace = defineRequirement<
  TranslationStructure,
  "nonexistent",
  ["key"]
>("nonexistent", ["key"]);

// ❌ Compile error - key doesn't exist in namespace
const invalidKey = defineRequirement<
  TranslationStructure,
  "common",
  ["nonexistent"]
>("common", ["nonexistent"]);
```

### Development Workflow

1. **Update translation files**
2. **Regenerate type definitions**: `npx colocale codegen messages types/messages.d.ts`
3. **Enjoy type safety**: Detect non-existent keys at compile time

### Add to package.json Scripts

```json
{
  "scripts": {
    "check": "colocale check messages",
    "codegen": "colocale codegen messages types/messages.d.ts",
    "codegen:watch": "nodemon --watch messages --ext json --exec 'npm run codegen'"
  }
}
```

## License

MIT
