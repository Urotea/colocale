/**
 * Type Error Demonstrations
 * 
 * This file contains intentionally incorrect code to demonstrate
 * that TypeScript catches type errors at compile time.
 * 
 * Uncomment each example to see the type error in your IDE.
 */

import { defineRequirement } from "./index";

interface CommonMessages {
  submit: string;
  cancel: string;
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
// Example 1: Invalid Namespace
// ============================================================================
/*
const example1 = defineRequirement<
  TranslationStructure,
  "invalid_namespace", // ❌ Type Error
  ["key"]
>("invalid_namespace", ["key"]);

// Error: Type '"invalid_namespace"' does not satisfy the constraint 'Namespace<TranslationStructure>'
// Expected: "common" | "user"
*/

// ============================================================================
// Example 2: Invalid Key for Namespace
// ============================================================================
/*
const example2 = defineRequirement<
  TranslationStructure,
  "common",
  ["nonexistent.key"] // ❌ Type Error
>("common", ["nonexistent.key"]);

// Error: Type '"nonexistent.key"' is not assignable to type 'KeysForNamespace<TranslationStructure, "common">'
// Expected: "submit" | "cancel"
*/

// ============================================================================
// Example 3: Invalid Nested Key
// ============================================================================
/*
const example3 = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.nonexistent"] // ❌ Type Error
>("user", ["profile.nonexistent"]);

// Error: Type '"profile.nonexistent"' is not assignable to type 'KeysForNamespace<TranslationStructure, "user">'
// Expected: "profile" | "profile.name" | "profile.email"
*/

// ============================================================================
// Example 4: Mixed Valid and Invalid Keys
// ============================================================================
/*
const example4 = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "invalid"] // ❌ Type Error on "invalid"
>("common", ["submit", "invalid"]);

// Error: Type '"invalid"' is not assignable to type 'KeysForNamespace<TranslationStructure, "common">'
// Expected: "submit" | "cancel"
*/

// ============================================================================
// Example 5: Key from Wrong Namespace
// ============================================================================
/*
const example5 = defineRequirement<
  TranslationStructure,
  "common",
  ["profile.name"] // ❌ Type Error - this belongs to "user" namespace
>("common", ["profile.name"]);

// Error: Type '"profile.name"' is not assignable to type 'KeysForNamespace<TranslationStructure, "common">'
// Note: "profile.name" is valid for "user" namespace but not "common"
*/

// ============================================================================
// Example 6: Typo in Namespace
// ============================================================================
/*
const example6 = defineRequirement<
  TranslationStructure,
  "comman", // ❌ Type Error - typo in "common"
  ["submit"]
>("comman", ["submit"]);

// Error: Type '"comman"' does not satisfy the constraint 'Namespace<TranslationStructure>'
// Did you mean "common"?
*/

// ============================================================================
// Example 7: Typo in Key
// ============================================================================
/*
const example7 = defineRequirement<
  TranslationStructure,
  "common",
  ["submitt"] // ❌ Type Error - typo in "submit"
>("common", ["submitt"]);

// Error: Type '"submitt"' is not assignable to type 'KeysForNamespace<TranslationStructure, "common">'
// Did you mean "submit"?
*/

// ============================================================================
// Valid Examples for Comparison
// ============================================================================

// ✓ Valid: Correct namespace and keys
export const validExample1 = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

// ✓ Valid: Nested keys
export const validExample2 = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);

// ✓ Valid: Parent and nested keys
export const validExample3 = defineRequirement<
  TranslationStructure,
  "user",
  ["profile", "profile.name"]
>("user", ["profile", "profile.name"]);

console.log("Type error demonstrations loaded.");
console.log(
  "Uncomment examples in src/type-error-demos.ts to see type errors in your IDE."
);
