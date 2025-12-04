/**
 * End-to-End Example: Full Workflow with Type-Safe defineRequirement
 * 
 * This example demonstrates the complete workflow from generating types
 * to using them with defineRequirement for type-safe translation requirements.
 */

// Step 1: Generate types from your translation files
// Command: npx colocale codegen test-messages types/messages.d.ts

// Step 2: Import the generated types
// In a real project, this would be:
// import type { TranslationStructure, Namespace, KeysForNamespace } from './types/messages';

// For this example, we define them inline (matching test-messages)
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

// Generated helper types
type Namespace = "common" | "user";
type CommonKeys = "submit" | "cancel" | "itemCount_one" | "itemCount_other";
type UserKeys = "profile" | "profile.name" | "profile.email";
type KeysForNamespace<N extends Namespace> = N extends "common"
  ? CommonKeys
  : N extends "user"
    ? UserKeys
    : never;

// Step 3: Import the library functions
import { defineRequirement, mergeRequirements, pickMessages, createTranslator } from "./index";

// ============================================================================
// Step 4: Define type-safe translation requirements
// ============================================================================

// Button component translations
export const buttonTranslations = defineRequirement<
  TranslationStructure,
  "common",
  ["submit", "cancel"]
>("common", ["submit", "cancel"]);

// User profile component translations
export const userProfileTranslations = defineRequirement<
  TranslationStructure,
  "user",
  ["profile.name", "profile.email"]
>("user", ["profile.name", "profile.email"]);

// Item count translations (with plurals)
export const itemCountTranslations = defineRequirement<
  TranslationStructure,
  "common",
  ["itemCount_one", "itemCount_other"]
>("common", ["itemCount_one", "itemCount_other"]);

// ============================================================================
// Step 5: Merge requirements for a page
// ============================================================================

export const userPageTranslations = mergeRequirements(
  buttonTranslations,
  userProfileTranslations,
  itemCountTranslations
);

// ============================================================================
// Step 6: Use in your application
// ============================================================================

async function loadTranslations(locale: string) {
  // In a real app, you would load from files
  // const allMessages: TranslationStructure = {
  //   common: (await import(`./messages/${locale}/common.json`)).default,
  //   user: (await import(`./messages/${locale}/user.json`)).default,
  // };

  // For this example, we use test data
  const allMessages: TranslationStructure = {
    common: {
      submit: "Submit",
      cancel: "Cancel",
      itemCount_one: "1 item",
      itemCount_other: "{{count}} items",
    },
    user: {
      profile: {
        name: "Name",
        email: "Email",
      },
    },
  };

  // Extract only needed translations
  const messages = pickMessages(allMessages, userPageTranslations);

  return messages;
}

// ============================================================================
// Step 7: Create translators in components
// ============================================================================

async function UserProfileComponent() {
  const messages = await loadTranslations("en");

  // Create a translator for user profile
  const t = createTranslator(messages, userProfileTranslations);

  // Type-safe translation calls
  const nameLabel = t("profile.name"); // ✅ Type-safe
  const emailLabel = t("profile.email"); // ✅ Type-safe
  // const invalidKey = t("profile.invalid"); // ❌ Would be a type error

  console.log("Name label:", nameLabel);
  console.log("Email label:", emailLabel);
}

async function ButtonComponent() {
  const messages = await loadTranslations("en");

  // Create a translator for buttons
  const t = createTranslator(messages, buttonTranslations);

  // Type-safe translation calls
  const submitText = t("submit"); // ✅ Type-safe
  const cancelText = t("cancel"); // ✅ Type-safe
  // const invalidKey = t("invalid"); // ❌ Would be a type error

  console.log("Submit button:", submitText);
  console.log("Cancel button:", cancelText);
}

async function ItemCountComponent() {
  const messages = await loadTranslations("en");

  // Create a translator for item count
  const t = createTranslator(messages, itemCountTranslations);

  // Plural handling
  const oneItem = t("itemCount", { count: 1 }); // "1 item"
  const manyItems = t("itemCount", { count: 5 }); // "5 items"

  console.log("One item:", oneItem);
  console.log("Many items:", manyItems);
}

// ============================================================================
// Run the example
// ============================================================================

console.log("=== End-to-End Type-Safe Translation Example ===\n");

UserProfileComponent().catch(console.error);
ButtonComponent().catch(console.error);
ItemCountComponent().catch(console.error);

console.log("\n✅ Type safety ensured at compile time!");
console.log("Invalid namespaces or keys would cause TypeScript errors.");
