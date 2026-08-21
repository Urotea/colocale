# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`colocale` is a published npm library (framework-agnostic i18n with a GraphQL-fragment-style collocation pattern). It ships two entry points: the runtime library (`src/index.ts`) and a CLI (`src/cli/main.ts`, exposed as the `colocale` bin).

Toolchain: **Bun** (runtime + test runner + package manager), TypeScript, **Biome** (lint + format), tsup (bundle).

## Commands

```bash
bun install
bun test                                   # all tests (bun:test)
bun test src/cli/codegen.test.ts           # single file
bun test --test-name-pattern "plural"      # single test/describe by name
bun run typecheck                          # tsc --noEmit (src) THEN tsc -p tsconfig.test.json (src + *.test.ts)
bun run lint                               # biome lint .
bun run format                             # biome check --write . (formats + fixes + organizes imports)
bun run build                              # tsup (esm+cjs bundles) THEN tsc (emitDeclarationOnly for .d.ts)
```

Exercising the CLI against the fixture translations in `test-messages/` (runs from source, no build needed):

```bash
bun run check test-messages         # or: bun run src/cli/main.ts check test-messages/ja
bun run codegen test-messages       # writes ./defineRequirement.ts (gitignored artifact)
```

Test files are **not** covered by the build `tsconfig.json` (it excludes `**/*.test.ts` so `tsc` does not emit `.d.ts` for them into `dist`), and `bun test` strips types instead of checking them. `tsconfig.test.json` exists purely so `bun run typecheck` also type-checks the tests — keep it in the `typecheck` script, otherwise type errors in tests become invisible again.

CI on PRs runs `typecheck`, `lint`, and `bun test`. Biome is the formatting source of truth even though `.vscode/settings.json` still names Prettier as the default formatter.

Examples in `example/react` and `example/vue` are standalone Vite apps with their own lockfiles that depend on the *published* package; they are not part of the root build, tests, or Biome scope.

## Architecture

### Data flow

```
LocaleTranslations           { [locale]: { [namespace]: { [flatKey]: string } } }   (JSON files)
  → pickMessages(all, requirements, locale)
Messages                    { locale, translations: { "namespace.key": string } }   (flattened, filtered)
  → createTranslator(messages, requirement)
t(key, values?)             namespace bound, key union constrained by the requirement
```

`Messages` is passed explicitly through props ("prop drilling") — there is deliberately **no** context/provider/global state, which is what makes the library work identically in React/Vue/vanilla and across server/client boundaries. Do not introduce module-level mutable state or framework imports into `src/`.

### Module responsibilities

- `src/index.ts` — public surface: `mergeRequirements`, `pickMessages`, `createTranslator`, plus re-exports of types, `InvalidPlaceholderError`, and the two validators.
- `src/plural.ts` / `src/utils.ts` — internal helpers (plural key selection/extraction; placeholder extraction and substitution). Not exported from the package.
- `src/validation.ts` — pure validators shared by the library export and the CLI: `validateTranslations` (per-locale) and `validateCrossLocale`.
- `src/cli/` — `main.ts` (commander wiring) → `loader.ts` (fs/JSON; the namespace is the file name minus the **trailing** `.json`, so `shop.items.json` → `shop.items`) → `validation.ts` → `formatter.ts` (console output). `codegen.ts` is a pure string-building function (`TranslationFile` → TypeScript source), which is why it is directly unit-testable.

### Invariants to preserve when changing behavior

- **Flat translation files only.** Nested objects are a validation error (`invalid-nesting`); grouping uses dot notation in the key (`"profile.name"`). `getNestedValue` in `src/utils.ts` is a legacy name — it is a plain flat lookup.
- **Plurals are `_one` / `_other` only.** Selection goes through `Intl.PluralRules` with fallback to `_other`. `pickMessages` auto-extracts `_one`/`_other` variants when a *base* key is requested, and `createTranslator` only takes the plural path when `values.count` is a number. Codegen strips plural suffixes so generated key unions expose the base key.
- **Missing message ⇒ return the key itself** (silent fallback). Missing *placeholder values* ⇒ throw `InvalidPlaceholderError`. Keep this asymmetry.
- **`Locale` is an open type** (`string`, i.e. any BCP 47 tag) in `src/types.ts`; nothing infers the set of locales from disk. `Messages<L>` and `pickMessages<R, L>` are generic over it so the passed tag survives into the return type, which lets applications declare their own closed union (`Messages<"en" | "ja">`) without the library hardcoding one. Do **not** re-narrow `Locale` — consumers cannot patch a library type. `selectPluralKey` must stay tolerant of malformed tags (`Intl.PluralRules` throws `RangeError`); it returns `undefined` and `resolvePluralMessage` falls back to `_other`.
- **`defineRequirement` is not shipped at runtime.** It exists only as generated code emitted by `colocale codegen` (see `src/cli/codegen.ts`); `Namespace`/`KeysForNamespace` in `src/types.ts` are the equivalents for hand-written requirements. Changing the requirement/typing contract means changing the emitted string template and its test.
- **Codegen derives types from a single locale** (`getFirstLocaleDirectory` picks the first locale subdirectory); cross-locale completeness is enforced separately by `colocale check`, whose `validateCrossLocale` treats the first locale as the reference for `missing-key`/`extra-key`.
- `check` validates **every** path argument (`checkPath` per path, errors aggregated into one exit code) — never just the first. For each path it tries multi-locale mode first and only falls back to single-locale-directory mode when no locale could be loaded. **An empty result is an error, not a pass**: a path with no translation files, or one whose locale subdirectories all failed to parse, makes `checkPath` throw and the command exit 1. Mode detection must not go back to being driven by a `try`/`catch` around the whole validation block — that is what made broken input report `✅ Validation passed`. `src/cli/check.test.ts` spawns the CLI to lock this down.

### Docs

- `README.md` is the user-facing documentation and is the file to update for any public API, CLI, or behavior change.
- `spec.md` is the original Japanese design spec. Parts of it predate the flat-structure-only migration (it still describes nested keys and a `NestedKeyOf` type), so treat the code as authoritative when they disagree.
