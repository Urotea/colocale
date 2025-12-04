/**
 * Example usage of type-safe defineRequirement
 * This file demonstrates how to use the type constraints feature
 */

import { defineRequirement } from "./index";

/**
 * First, generate your translation types using:
 * npx colocale codegen messages types/messages.d.ts
 *
 * This will generate a TranslationStructure interface that looks like:
 */

// Example generated types (from codegen)
interface CommonMessages {
  submit: string;
  cancel: string;
  itemCount_one: string;
  itemCount_other: string;
}

interface UserProfileMessages {
  name: string;
  email: string;
}

interface UserMessages {
  profile: UserProfileMessages;
}

interface TranslationStructure {
  common: CommonMessages;
  user: UserMessages;
}

// ============================================================================
// Usage Examples
// ============================================================================

// Example 1: Without type parameter (backward compatible)
// This works like before - accepts any string
export const basicReq = defineRequirement("any_namespace", ["any.key"]);

// Example 2: With type parameter (type-safe)
// TypeScript will validate that namespace and keys exist in TranslationStructure
export const commonReq = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

export const userReq = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);

// Example 3: With plural keys
export const pluralReq = defineRequirement<
  TranslationStructure,
  "common",
  ["itemCount_one", "itemCount_other"]
>("common", ["itemCount_one", "itemCount_other"]);

// Example 4: Mixing parent and nested keys
export const mixedReq = defineRequirement<
  TranslationStructure,
  "user",
  ["profile", "profile.name"]
>("user", ["profile", "profile.name"]);

// ============================================================================
// Type Errors (commented out - uncomment to see type errors in your IDE)
// ============================================================================

/*
// ❌ Error: "invalid_namespace" is not a valid namespace
export const invalidNamespace = defineRequirement<
  TranslationStructure,
  "invalid_namespace",
  ["key"]
>("invalid_namespace", ["key"]);

// ❌ Error: "nonexistent.key" is not a valid key for "common" namespace
export const invalidKey = defineRequirement<
  TranslationStructure,
  "common",
  ["nonexistent.key"]
>("common", ["nonexistent.key"]);

// ❌ Error: "profile.nonexistent" is not a valid nested key
export const invalidNestedKey = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.nonexistent"]
>("user", ["profile.nonexistent"]);

// ❌ Error: "invalid" is not a valid key for "common" namespace
export const mixedValidInvalid = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "invalid"]
>("common", ["submit", "invalid"]);

// ❌ Error: "profile.name" belongs to "user" namespace, not "common"
export const wrongNamespace = defineRequirement<
  TranslationStructure,
  "common",
  ["profile.name"]
>("common", ["profile.name"]);
*/

// ============================================================================
// Benefits
// ============================================================================

/**
 * Benefits of using type-safe defineRequirement:
 *
 * 1. **Compile-time validation**: Catch typos before runtime
 * 2. **IDE autocomplete**: Get suggestions for valid namespaces and keys
 * 3. **Refactoring safety**: Renaming keys shows all affected usages
 * 4. **Self-documenting**: Types serve as documentation
 * 5. **Backward compatible**: Works without type parameter for existing code
 */
