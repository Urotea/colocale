# Type-Safe defineRequirement Feature

## Overview

The `defineRequirement` function now supports type constraints to ensure namespace and keys are valid at compile time.

## Usage

### Without Type Parameter (Backward Compatible)

```typescript
import { defineRequirement } from "colocale";

// Works as before - accepts any string
const req = defineRequirement("any_namespace", ["any.key"]);
```

### With Type Parameter (Type-Safe)

```typescript
import { defineRequirement } from "colocale";
import type { TranslationStructure } from "./types/messages";

// TypeScript validates namespace and keys
const req = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

// Type error: "invalid" is not a valid namespace
const invalidReq = defineRequirement<
  TranslationStructure,
  "invalid",
  ["key"]
>("invalid", ["key"]); // ❌ Error

// Type error: "nonexistent" is not a valid key for "common"
const invalidKey = defineRequirement<
  TranslationStructure,
  "common",
  ["nonexistent"]
>("common", ["nonexistent"]); // ❌ Error
```

## Generating Types

First, generate TypeScript types from your translation files:

```bash
npx colocale codegen messages types/messages.d.ts
```

This generates:

1. **TranslationStructure**: Interface representing your translation structure
2. **Namespace**: Union type of all namespace names
3. **KeysForNamespace**: Type helper to get valid keys for a namespace
4. **CommonKeys, UserKeys, etc.**: Specific key types for each namespace

### Generated Types Example

```typescript
// types/messages.d.ts (auto-generated)

export interface CommonMessages {
  submit: string;
  cancel: string;
}

export interface UserMessages {
  profile: {
    name: string;
    email: string;
  };
}

export interface TranslationStructure {
  common: CommonMessages;
  user: UserMessages;
}

export type Namespace = "common" | "user";
export type CommonKeys = "submit" | "cancel";
export type UserKeys = "profile" | "profile.name" | "profile.email";
export type KeysForNamespace<N extends Namespace> =
  N extends "common" ? CommonKeys :
  N extends "user" ? UserKeys :
  never;
```

## Benefits

1. **Compile-time validation**: Catch typos in namespace/keys before runtime
2. **IDE autocomplete**: Get suggestions for valid namespaces and keys
3. **Refactoring safety**: Renaming translation keys shows all affected usages
4. **Self-documenting**: Type definitions serve as documentation
5. **Backward compatible**: Existing code without type parameters continues to work

## Examples

### Valid Usage

```typescript
import { defineRequirement } from "colocale";
import type { TranslationStructure } from "./types/messages";

// ✓ Valid namespace and keys
const commonReq = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

// ✓ Nested keys
const userReq = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);

// ✓ Plural keys
const pluralReq = defineRequirement<
  TranslationStructure,
  "common",
  ["itemCount_one", "itemCount_other"]
>("common", ["itemCount_one", "itemCount_other"]);
```

### Type Errors

```typescript
// ❌ Invalid namespace
const invalidNs = defineRequirement<
  TranslationStructure,
  "invalid_namespace",
  ["key"]
>("invalid_namespace", ["key"]);
// Error: Type '"invalid_namespace"' does not satisfy the constraint 'Namespace<TranslationStructure>'.
//        Argument of type '"invalid_namespace"' is not assignable to parameter of type '"common" | "user"'.

// ❌ Invalid key for namespace
const invalidKey = defineRequirement<
  TranslationStructure,
  "common",
  ["nonexistent.key"]
>("common", ["nonexistent.key"]);
// Error: Type '"nonexistent.key"' is not assignable to type 'KeysForNamespace<TranslationStructure, "common">'.
//        Type '"nonexistent.key"' is not assignable to type '"submit" | "cancel" | "itemCount_one" | "itemCount_other"'.

// ❌ Key from wrong namespace
const wrongNs = defineRequirement<
  TranslationStructure,
  "common",
  ["profile.name"]
>("common", ["profile.name"]);
// Error: Type '"profile.name"' is not assignable to type 'KeysForNamespace<TranslationStructure, "common">'.
//        Type '"profile.name"' is not assignable to type '"submit" | "cancel" | "itemCount_one" | "itemCount_other"'.
```

## Migration Guide

Existing code continues to work without changes:

```typescript
// Before (still works)
const req = defineRequirement("common", ["submit", "cancel"]);

// After (with type safety)
const req = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);
```

To adopt type-safe usage:

1. Run `npx colocale codegen messages types/messages.d.ts`
2. Import the generated `TranslationStructure` type
3. Add type parameters to `defineRequirement` calls
4. Fix any type errors revealed by the constraints

## Type Utilities

The package exports these type utilities for advanced usage:

- `Namespace<T>`: Extract valid namespace names from a translation structure
- `KeysForNamespace<T, N>`: Extract valid keys for a specific namespace

```typescript
import type { Namespace, KeysForNamespace } from "colocale";
import type { TranslationStructure } from "./types/messages";

type Namespaces = Namespace<TranslationStructure>; // "common" | "user"
type CommonKeys = KeysForNamespace<TranslationStructure, "common">; // "submit" | "cancel"
```
