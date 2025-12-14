# colocale

A lightweight i18n library that supports both server and client components.

Inspired by GraphQL's fragment collocation pattern, each component can declaratively define the translation keys it needs. While it works great with Next.js App Router, it's framework-agnostic and can be used in any React application.

## Features

- 🎯 **Colocation**: Define translation keys alongside your components
- 🔒 **Type-safe**: Full TypeScript support with auto-generated types
- 📦 **Lightweight**: Zero dependencies, simple API
- 🌐 **Pluralization**: Built on `Intl.PluralRules` for proper plural handling
- ⚡ **Fast**: Extract and send only the translations needed by components
- 🔄 **Universal**: Works in both server and client components

## Design Philosophy

### Build-Time Safety Over Runtime Fallback

Colocale intentionally **does not provide automatic runtime fallback** to a default language when translations are missing. This is a deliberate design choice, not a limitation.

**Why no automatic fallback?**

Traditional i18n libraries often fall back to a default language (like English) when translations are missing. While convenient during development, this approach has significant downsides:

- ❌ **Silent failures in production**: Missing translations go unnoticed until users report them
- ❌ **Inconsistent user experience**: Users see a mix of their language and the fallback language
- ❌ **No accountability**: Developers aren't forced to ensure complete translations before deployment

**Our approach: Fail fast at build time, not runtime**

Instead of hiding problems at runtime, colocale ensures translation completeness at build/CI time:

- ✅ **`npx colocale check` validates all translations** before they reach production
- ✅ **CI/CD integration** catches missing translations in pull requests
- ✅ **Type-safe keys** prevent typos and invalid references at compile time
- ✅ **Consistent user experience** - all translations are complete, or the build fails

**Integrate into your CI pipeline:**

```yaml
# .github/workflows/ci.yml
- name: Validate translations
  run: npx colocale check messages
```

This design philosophy ensures that translation issues are caught early in the development process, not by your users in production. When you do need runtime behavior for truly missing keys (edge cases), the library returns the key name itself, making the issue immediately visible during testing.

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

# Validate translation files (RECOMMENDED: Add to CI/CD pipeline)
npx colocale check messages/ja          # Single locale
npx colocale check messages              # All locales + consistency check

# Generate type-safe defineRequirement function
npx colocale codegen messages            # Output: defineRequirement.ts (default)
npx colocale codegen messages src/i18n/defineRequirement.ts  # Custom output path
```

### Why `npx colocale check` is Essential

The `check` command is your safety net for preventing translation issues in production:

- **Validates translation file structure**: Ensures proper flat structure and valid JSON
- **Checks key consistency across locales**: Detects missing or extra keys between languages
- **Validates plural forms**: Ensures all required plural forms (`_one`, `_other`) are present
- **Verifies placeholder syntax**: Catches malformed placeholders before they break at runtime
- **Cross-locale validation**: When checking multiple locales, ensures all have identical key structures

**Add to your CI/CD pipeline to enforce translation completeness:**

```yaml
# .github/workflows/ci.yml (or similar)
- name: Check translation completeness
  run: npx colocale check messages
  # Build will fail if any translations are missing or inconsistent
```

This ensures no missing translations slip into production, maintaining a consistent user experience across all supported languages.

## Quick Start

### 1. Create Translation Files

Create JSON files for each namespace using **flat structure** (level 0).

**Important:** Translation files now use flat structure only. Nested objects are not allowed. Use dot notation for grouping (e.g., `"profile.name"` instead of nested `{"profile": {"name": "..."}}`).

```json
// messages/en/common.json
{
  "submit": "Submit",
  "cancel": "Cancel",
  "itemCount_one": "1 item",
  "itemCount_other": "{{count}} items"
}
```

```json
// messages/en/user.json
{
  "profile.name": "Name",
  "profile.email": "Email"
}
```

### 2. Placeholder Support

Colocale supports dynamic placeholders in your translation strings using the `{{variableName}}` syntax.

**Translation file:**

```json
// messages/en/common.json
{
  "greeting": "Hello, {{name}}!",
  "welcome": "Welcome {{user}}, you have {{count}} new messages"
}
```

**Usage:**

```typescript
const t = createTranslator(messages, commonTranslations);

t("greeting", { name: "Alice" });
// Output: "Hello, Alice!"

t("welcome", { user: "Bob", count: 5 });
// Output: "Welcome Bob, you have 5 new messages"
```

**Placeholder rules:**

- Placeholders use double curly braces: `{{variableName}}`
- Variable names must contain only alphanumeric characters and underscores
- Values are automatically converted to strings
- Placeholders work seamlessly with pluralization (see pluralization examples in translation files)

### 3. Generate Type-Safe defineRequirement Function (Recommended)

```bash
npx colocale codegen messages
```

This automatically generates a type-safe `defineRequirement` function from your translation files. The generated file (default: `defineRequirement.ts`) includes:

- TypeScript type definitions for your translation structure
- A ready-to-use `defineRequirement` function with full type inference

### 4. Separate Translation Requirements from Components (Best Practice)

When using colocale with Next.js App Router, separate translation requirements from component files to avoid bundler issues with the Server/Client Component boundary.

**Create a separate `translations.ts` file** (without `'use client'`):

```typescript
// app/users/translations.ts
import defineRequirement from "@/defineRequirement"; // Generated by codegen
import { mergeRequirements } from "colocale";

// Component-specific translation requirements with full type safety
export const userProfileTranslations = defineRequirement("user", [
  "profile.name",
  "profile.email",
]);

export const commonTranslations = defineRequirement("common", [
  "submit",
  "cancel",
]);

// Page-level merged requirements
export const userPageTranslations = mergeRequirements(
  commonTranslations,
  userProfileTranslations
);
```

**Note:** The `defineRequirement` function generated by `codegen` provides full type inference and compile-time validation automatically.

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

### 5. Aggregate Translation Requirements

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

### 6. Extract Translations in Server Components

Translations must be organized in locale-grouped format. Import translation files per locale and namespace, then compose them:

```typescript
// app/[locale]/users/page.tsx
import { pickMessages } from "colocale";
import { userPageTranslations } from "./translations";
import UserPage from "./UserPage";

// Import translations per locale and namespace (static imports)
import jaCommonTranslations from "@/messages/ja/common.json";
import jaUserTranslations from "@/messages/ja/user.json";
import enCommonTranslations from "@/messages/en/common.json";
import enUserTranslations from "@/messages/en/user.json";

export default async function Page({ params }: { params: { locale: string } }) {
  // Compose into locale-grouped structure
  const allMessages = {
    ja: {
      common: jaCommonTranslations,
      user: jaUserTranslations,
    },
    en: {
      common: enCommonTranslations,
      user: enUserTranslations,
    },
  };

  // pickMessages filters by locale and extracts only the needed translations
  const messages = pickMessages(
    allMessages,
    userPageTranslations,
    params.locale
  );

  return <UserPage messages={messages} />;
}
```

**For larger applications, you can use dynamic imports:**

```typescript
// app/[locale]/users/page.tsx
import { pickMessages } from "colocale";
import { userPageTranslations } from "./translations";
import UserPage from "./UserPage";

export default async function Page({ params }: { params: { locale: string } }) {
  // Extract required namespaces from translation requirements
  const namespaces = userPageTranslations.map((req) => req.namespace);
  // Remove duplicates to avoid importing the same file multiple times
  const uniqueNamespaces = Array.from(new Set(namespaces));
  
  // Dynamically import only the needed locale's translations
  const translations = await Promise.all(
    uniqueNamespaces.map(async (namespace) => ({
      namespace,
      data: (await import(`@/messages/${params.locale}/${namespace}.json`)).default,
    }))
  );

  // Compose into locale-grouped structure
  const allMessages = {
    [params.locale]: Object.fromEntries(
      translations.map(({ namespace, data }) => [namespace, data])
    ),
  };
  
  // pickMessages filters to the specified locale
  const messages = pickMessages(
    allMessages,
    userPageTranslations,
    params.locale
  );

  return <UserPage messages={messages} />;
}
```

**Translation file structure:**

```
messages/
  ├── ja/
  │   ├── common.json
  │   └── user.json
  └── en/
      ├── common.json
      └── user.json
```

```json
// messages/ja/common.json
{
  "submit": "送信",
  "cancel": "キャンセル"
}
```

```json
// messages/en/common.json
{
  "submit": "Submit",
  "cancel": "Cancel"
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

Extracts only the needed translations from locale-grouped translation files.

```typescript
function pickMessages(
  allMessages: LocaleTranslations,
  requirements: TranslationRequirement[] | TranslationRequirement,
  locale: Locale
): Messages;
```

**Parameters:**

- `allMessages`: Object containing translations grouped by locale: `{ [locale]: { [namespace]: { [key]: translation } } }`
- `requirements`: Translation requirement(s) defining which keys to extract
- `locale`: Locale identifier (see `Locale` type) - used for filtering translations and proper pluralization with `Intl.PluralRules`

**Locale type**: The `Locale` type provides autocomplete for supported locale codes (`"en"`, `"ja"`) while still accepting any BCP 47 language tag as a string.

**Automatic plural extraction**: When you specify a base key (e.g., `"itemCount"`), keys with `_one`, `_other` suffixes are automatically extracted based on `Intl.PluralRules`.

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

**Generated by codegen (Recommended):**

The `codegen` command generates a type-safe `defineRequirement` function that automatically validates namespaces and keys:

```bash
npx colocale codegen messages  # Generates defineRequirement.ts
```

```typescript
import defineRequirement from "./defineRequirement"; // Generated file

// ✅ Full type safety with auto-completion
const req = defineRequirement("common", ["submit", "cancel"]);

// ❌ Compile error - namespace doesn't exist
const req = defineRequirement("invalid", ["key"]);

// ❌ Compile error - key doesn't exist in namespace
const req = defineRequirement("common", ["invalid"]);
```

**Manual usage (without codegen):**

The recommended approach is to use the `codegen` command to generate the type-safe `defineRequirement` function. If you need to create translation requirements manually without type safety, you can create them directly:

```typescript
import type { TranslationRequirement } from "colocale";

// Manually create a translation requirement (no compile-time type safety)
const req: TranslationRequirement<readonly ["submit", "cancel"]> = {
  namespace: "common",
  keys: ["submit", "cancel"],
};
```

Note: Manual usage does not provide compile-time validation of namespaces and keys. Use the `codegen` command for full type safety.

## License

MIT
