/**
 * Type-level tests for defineRequirement type constraints
 * This file validates that the type constraints work correctly at compile time.
 * Run `npm run typecheck` to verify these types.
 */

import { defineRequirement } from "./index";
import type { Namespace, KeysForNamespace } from "./types";

// Define a test translation structure
interface TestCommonMessages {
  submit: string;
  cancel: string;
  itemCount_one: string;
  itemCount_other: string;
}

interface TestUserProfileMessages {
  name: string;
  email: string;
}

interface TestUserMessages {
  profile: TestUserProfileMessages;
}

interface TestTranslationStructure {
  common: TestCommonMessages;
  user: TestUserMessages;
}

// ============================================================================
// Type extraction tests
// ============================================================================

// Test Namespace type extraction
type TestNamespaces = Namespace<TestTranslationStructure>;
const _testNamespace1: TestNamespaces = "common"; // ✓ Valid
const _testNamespace2: TestNamespaces = "user"; // ✓ Valid
// @ts-expect-error - invalid namespace should error
const _testNamespaceInvalid: TestNamespaces = "invalid";

// Test KeysForNamespace type extraction for "common"
type TestCommonKeys = KeysForNamespace<TestTranslationStructure, "common">;
const _testCommonKey1: TestCommonKeys = "submit"; // ✓ Valid
const _testCommonKey2: TestCommonKeys = "cancel"; // ✓ Valid
const _testCommonKey3: TestCommonKeys = "itemCount_one"; // ✓ Valid
const _testCommonKey4: TestCommonKeys = "itemCount_other"; // ✓ Valid
// @ts-expect-error - invalid key should error
const _testCommonKeyInvalid: TestCommonKeys = "invalid";

// Test KeysForNamespace type extraction for "user" (nested keys)
type TestUserKeys = KeysForNamespace<TestTranslationStructure, "user">;
const _testUserKey1: TestUserKeys = "profile"; // ✓ Valid (parent key)
const _testUserKey2: TestUserKeys = "profile.name"; // ✓ Valid (nested key)
const _testUserKey3: TestUserKeys = "profile.email"; // ✓ Valid (nested key)
// @ts-expect-error - invalid nested key should error
const _testUserKeyInvalid1: TestUserKeys = "profile.invalid";
// @ts-expect-error - invalid parent key should error
const _testUserKeyInvalid2: TestUserKeys = "invalid";

// ============================================================================
// defineRequirement usage tests
// ============================================================================

// ✓ Without type parameter (backward compatible) - accepts any string
const req1 = defineRequirement("any_namespace", ["any.key"]);
const req2 = defineRequirement("common", ["submit", "cancel"]);

// ✓ With type parameter - valid namespace and keys
const req3 = defineRequirement<
  TestTranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

const req4 = defineRequirement<
  TestTranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);

// ✓ With plural keys
const req5 = defineRequirement<
  TestTranslationStructure,
  "common",
  ["itemCount_one", "itemCount_other"]
>("common", ["itemCount_one", "itemCount_other"]);

// ✓ With parent and nested keys
const req6 = defineRequirement<
  TestTranslationStructure,
  "user",
  ["profile", "profile.name"]
>("user", ["profile", "profile.name"]);

// ============================================================================
// Type error tests (commented out - uncomment to verify type errors)
// ============================================================================

/*
// ❌ Invalid namespace
const reqInvalidNamespace = defineRequirement<TestTranslationStructure>(
  "invalid_namespace", // Should error: not a valid namespace
  ["key"]
);

// ❌ Invalid key for namespace
const reqInvalidKey = defineRequirement<TestTranslationStructure>(
  "common",
  ["nonexistent.key"] // Should error: not a valid key for "common"
);

// ❌ Invalid nested key
const reqInvalidNestedKey = defineRequirement<TestTranslationStructure>(
  "user",
  ["profile.nonexistent"] // Should error: not a valid nested key
);

// ❌ Mixed valid and invalid keys
const reqMixedKeys = defineRequirement<TestTranslationStructure>(
  "common",
  ["submit", "invalid"] // Should error: "invalid" is not a valid key
);

// ❌ Key from wrong namespace
const reqWrongNamespace = defineRequirement<TestTranslationStructure>(
  "common",
  ["profile.name"] // Should error: "profile.name" is not in "common" namespace
);
*/

// Export to avoid unused variable warnings
export { req1, req2, req3, req4, req5, req6 };
