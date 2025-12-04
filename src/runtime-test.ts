/**
 * Runtime tests for the defineRequirement type constraints
 * These tests verify that the function works correctly at runtime
 * while TypeScript provides compile-time safety
 */

// Simple test structure matching test-messages
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

import { defineRequirement } from "./index";

// Test 1: Runtime behavior without type parameter (backward compatible)
console.log("Test 1: Without type parameter");
const req1 = defineRequirement("any_namespace", ["any.key"]);
console.assert(req1.namespace === "any_namespace", "Namespace should match");
console.assert(
  JSON.stringify(req1.keys) === JSON.stringify(["any.key"]),
  "Keys should match"
);
console.log("✓ Test 1 passed");

// Test 2: Runtime behavior with type parameter
console.log("\nTest 2: With type parameter");
const req2 = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);
console.assert(req2.namespace === "common", "Namespace should be 'common'");
console.assert(
  JSON.stringify(req2.keys) === JSON.stringify(["submit", "cancel"]),
  "Keys should match"
);
console.log("✓ Test 2 passed");

// Test 3: Nested keys
console.log("\nTest 3: Nested keys");
const req3 = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);
console.assert(req3.namespace === "user", "Namespace should be 'user'");
console.assert(
  JSON.stringify(req3.keys) === JSON.stringify([
    "profile.name",
    "profile.email",
  ]),
  "Nested keys should match"
);
console.log("✓ Test 3 passed");

// Test 4: Plural keys
console.log("\nTest 4: Plural keys");
const req4 = defineRequirement<
  TranslationStructure,
  "common",
  ["itemCount_one", "itemCount_other"]
>("common", ["itemCount_one", "itemCount_other"]);
console.assert(req4.namespace === "common", "Namespace should be 'common'");
console.assert(
  JSON.stringify(req4.keys) === JSON.stringify([
    "itemCount_one",
    "itemCount_other",
  ]),
  "Plural keys should match"
);
console.log("✓ Test 4 passed");

// Test 5: Mixed parent and nested keys
console.log("\nTest 5: Mixed parent and nested keys");
const req5 = defineRequirement<
  TranslationStructure,
  "user",
  ["profile", "profile.name"]
>("user", ["profile", "profile.name"]);
console.assert(req5.namespace === "user", "Namespace should be 'user'");
console.assert(
  JSON.stringify(req5.keys) === JSON.stringify(["profile", "profile.name"]),
  "Mixed keys should match"
);
console.log("✓ Test 5 passed");

console.log("\n✅ All runtime tests passed!");
console.log(
  "\nNote: Compile-time type safety is verified by TypeScript during build."
);
console.log(
  "Invalid namespaces or keys will cause TypeScript errors before runtime."
);
