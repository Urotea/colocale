/**
 * This file is used to manually verify that the type constraints are working correctly.
 * It should produce type errors when uncommenting the lines marked with "SHOULD ERROR".
 */

import { createTranslator, defineRequirement } from "./index";
import type { Messages } from "./index";

const messages: Messages = {
  "site.list.itemsCount": "{{count}} items found",
  "site.header.title": "Welcome",
  "site.footer.copyright": "© 2023",
};

// Test 1: Basic type constraint
const translations1 = defineRequirement("site", ["list.itemsCount"] as const);
const t1 = createTranslator(messages, translations1);

// ✓ This should work
t1("list.itemsCount", { count: 5 });

// ✗ Uncomment to verify type error:
// t1("header.title"); // SHOULD ERROR: Argument of type '"header.title"' is not assignable to parameter of type '"list.itemsCount"'

// Test 2: Multiple keys
const translations2 = defineRequirement("site", [
  "list.itemsCount",
  "header.title",
] as const);
const t2 = createTranslator(messages, translations2);

// ✓ These should work
t2("list.itemsCount", { count: 3 });
t2("header.title");

// ✗ Uncomment to verify type error:
// t2("footer.copyright"); // SHOULD ERROR: Argument of type '"footer.copyright"' is not assignable to parameter

// Test 3: Type inference with const assertion
const keys = ["list.itemsCount", "footer.copyright"] as const;
const translations3 = defineRequirement("site", keys);
const t3 = createTranslator(messages, translations3);

// ✓ These should work
t3("list.itemsCount", { count: 10 });
t3("footer.copyright");

// ✗ Uncomment to verify type error:
// t3("header.title"); // SHOULD ERROR: Argument of type '"header.title"' is not assignable to parameter

console.log("Type constraint verification file - check for compile-time type errors");
