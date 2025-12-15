# colocale

A lightweight i18n library that works across frameworks and JavaScript runtimes.

Inspired by GraphQL's fragment collocation pattern, each component can declaratively define the translation keys it needs. Designed to work with any component-based framework including React, Vue, and others, it excels in both client-side and server-side rendering environments.

## Features

- 🎯 **Colocation**: Define translation keys alongside your components
- 🔒 **Type-safe**: Full TypeScript support with auto-generated types
- 📦 **Lightweight**: Zero dependencies, simple API
- 🌐 **Pluralization**: Built on `Intl.PluralRules` for proper plural handling
- ⚡ **Fast**: Extract and send only the translations needed by components
- 🔄 **Universal**: Works in Node.js, browsers, edge runtimes, and any JavaScript environment
- 🎨 **Framework-agnostic**: Compatible with React, Vue, and other component-based frameworks

## Runtime & Framework Compatibility

Colocale is designed to work across various JavaScript runtimes and frameworks:

**Runtimes:**

- Node.js
- Browsers
- Edge runtimes (Cloudflare Workers, Vercel Edge, etc.)
- Any JavaScript runtime with `Intl` support

**Frameworks:**

- Works with any component-based framework (React, Vue, Svelte, etc.)
- Particularly effective with frameworks that support server-side rendering
- Examples available for React and Vue in the `example/` directory

Whether you're building a client-side SPA, a server-rendered application, or a hybrid app, colocale adapts to your architecture.

## Design Philosophy

### Why No Provider/Context?

Unlike many i18n libraries, colocale intentionally avoids using React Context, Vue's provide/inject, or similar dependency injection mechanisms. This design choice enables several key benefits:

**🌍 True Framework Agnosticism**

- Works identically in React, Vue, Svelte, or vanilla JavaScript
- No framework-specific runtime dependencies
- Same API across all environments

**🔍 Explicit Dependencies**

- Component translation requirements are clearly visible in code
- Easy to trace which translations a component tree needs
- Facilitates static analysis and tree-shaking

**⚙️ Universal Compatibility**

- Works seamlessly in server components, client components, and hybrid scenarios
- No issues with framework-specific boundaries (like Next.js Server/Client Component boundary)
- Runs in any JavaScript environment (Node.js, Deno, Bun, browsers, edge runtimes)

**🎯 Pure Functions by Design**

- Components remain pure functions—same input (props) produces same output
- No hidden dependencies through context means components are fully predictable
- Translations flow explicitly through props, following standard component patterns
- Easier to test, debug, and reason about component behavior

By passing `messages` explicitly through props ("prop drilling"), colocale guarantees that the same code works across all frameworks and runtimes. This is not a compromise—it's the foundation that enables universal compatibility and keeps your components as pure, predictable functions.

### Embracing Prop Drilling

Yes, colocale requires passing `messages` through props—this is intentional! While "prop drilling" is often seen as an anti-pattern, for i18n it provides significant advantages:

**✅ Why It Works for i18n:**

1. **Single prop**: Only one `messages` object needs to be passed down
2. **Stable data**: Translations rarely change during runtime
3. **Clear contract**: Component interfaces explicitly show i18n dependency
4. **Performance**: No context re-renders or provider overhead
5. **Flexibility**: Components can be used anywhere without provider setup

**📚 GraphQL Inspiration:**
This pattern is inspired by GraphQL's fragment collocation, where data requirements are defined alongside components and aggregated up the tree. Just as GraphQL fragments make data dependencies explicit, colocale makes translation dependencies explicit.

### When to Use colocale

colocale is ideal when you want:

- A framework-agnostic i18n solution that works everywhere
- Explicit, traceable translation dependencies
- To work with server-side rendering and modern meta-frameworks
- Type-safe translations with minimal setup
- A simple, predictable API without magic

If you prefer context-based solutions or need framework-specific features, consider alternatives like react-i18next or vue-i18n.

## Key Features

### Type-Safe by Design

Colocale prioritizes catching errors as early as possible in the development cycle, ideally at compile time with TypeScript.

**🔒 Compile-Time Validation**

- Generated `defineRequirement` function provides full type inference
- TypeScript catches typos and invalid translation keys before runtime
- Auto-completion for namespaces and keys in your IDE

**🛡️ Build-Time Validation**

When compile-time validation isn't possible, colocale validates at build/CI time:

- ✅ **`npx colocale check` validates all translations** before they reach production
- ✅ **Validates translation file structure** and ensures proper flat structure
- ✅ **Checks key consistency across locales** to catch missing translations
- ✅ **Verifies plural forms and placeholder syntax**
- ✅ **CI/CD integration** catches issues in pull requests

**Integrate into your CI pipeline:**

```yaml
# .github/workflows/ci.yml
- name: Validate translations
  run: npx colocale check messages
```

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

> **💡 Looking for complete examples?** Check out the working examples in the [`example/`](./example) directory:
>
> - [React example](./example/react) - React 18 with React Router
> - [Vue example](./example/vue) - Vue 3 with Vue Router

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

### 4. Define Translation Requirements

**Create a dedicated file for translation requirements:**

```typescript
// translations.ts (or wherever you organize your i18n code)
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

**Use in your components:**

```typescript
// UserProfile.tsx (React) or UserProfile.vue (Vue)
import { createTranslator, type Messages } from "colocale";
import { userProfileTranslations } from "./translations";

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

### 5. Use Translations in Your Application

```typescript
// UserPage.tsx (React) or UserPage.vue (Vue)
import { createTranslator, type Messages } from "colocale";
import { commonTranslations, userPageTranslations } from "./translations";
import UserProfile from "./UserProfile";

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

### 6. Load and Extract Translations

Colocale requires translations to be organized in a locale-grouped format. How you load translations depends on your framework and architecture:

**Basic structure:**

```typescript
// Compose translations into locale-grouped structure
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

// Use pickMessages to extract only the needed translations for a specific locale
import { pickMessages } from "colocale";

const messages = pickMessages(
  allMessages,
  userPageTranslations,
  locale // e.g., "ja" or "en"
);
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

**See the [`example/`](./example) directory for complete implementations:**

- **React example**: Client-side application with static imports for translations
- **Vue example**: Client-side application with dynamic imports for translations

## Using with Next.js App Router

When using colocale with Next.js App Router, you can take advantage of server-side rendering for optimal performance. This pattern applies to any server-rendering framework, but Next.js is shown as a practical example.

### Best Practices for Next.js

**Separate translation requirements from Client Components** to avoid bundler issues:

1. **Create a dedicated `translations.ts` file** (without `'use client'`):

```typescript
// app/users/translations.ts
import defineRequirement from "@/defineRequirement";
import { mergeRequirements } from "colocale";

export const userProfileTranslations = defineRequirement("user", [
  "profile.name",
  "profile.email",
]);

export const commonTranslations = defineRequirement("common", [
  "submit",
  "cancel",
]);

export const userPageTranslations = mergeRequirements(
  commonTranslations,
  userProfileTranslations
);
```

2. **Use in Client Components:**

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

**⚠️ Why separate files?** If you export translation requirements from a Client Component (with `'use client'`), Next.js's bundler creates proxy functions instead of the actual values, breaking `mergeRequirements` and type safety.

### Loading Translations in Server Components

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
      data: (
        await import(`@/messages/${params.locale}/${namespace}.json`)
      ).default,
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

### Next.js Best Practices Summary

- ✅ **DO** create a separate `translations.ts` file (without `'use client'`) for translation requirements
- ✅ **DO** import translation requirements from this shared file in both Server and Client Components
- ✅ **DO** colocate `translations.ts` with the components that use them (e.g., per page or feature folder)
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

**Locale type**: The `Locale` type currently supports `"en"` and `"ja"`. Additional locales will be supported in future releases.

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
