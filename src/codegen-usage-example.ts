/**
 * Example demonstrating usage with generated types from codegen
 *
 * First, generate types:
 * npx colocale codegen test-messages types/messages.d.ts
 */

import { defineRequirement } from "./index";

// Import generated types (this would come from the generated file)
// In a real project: import type { TranslationStructure, Namespace, KeysForNamespace } from "./types/messages";

// For this example, we'll define them inline to match test-messages
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

// Generated helper types (from codegen)
type Namespace = "common" | "user";
type CommonKeys = "submit" | "cancel" | "itemCount_one" | "itemCount_other";
type UserKeys = "profile" | "profile.name" | "profile.email";
type KeysForNamespace<N extends Namespace> = N extends "common"
  ? CommonKeys
  : N extends "user"
    ? UserKeys
    : never;

// ============================================================================
// Type-safe usage with generated types
// ============================================================================

// ✓ Valid: Using generated helper types
export const req1 = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

export const req2 = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);

// ✓ Valid: Using all keys for a namespace
export const req3 = defineRequirement<TranslationStructure, "common", CommonKeys[]>(
  "common",
  ["submit", "cancel", "itemCount_one", "itemCount_other"]
);

// ============================================================================
// Alternative: Simplified syntax (future enhancement)
// ============================================================================

/**
 * Note: For the cleanest syntax, you would need to create wrapper functions
 * that pre-bind the TranslationStructure type. This is left as an exercise
 * for users who want even more ergonomic usage.
 *
 * For most use cases, the explicit type parameter approach shown above
 * provides the best balance of type safety and usability.
 */
