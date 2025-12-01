#!/usr/bin/env node

import { resolve } from "node:path";
import { validateTranslations } from "./validation";
import { loadTranslationsFromDirectory } from "./cli/loader";
import { printValidationResult } from "./cli/formatter";

/**
 * Main process
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: colocale-check <translation-directory-path>");
    console.error("Example: colocale-check messages/ja");
    console.error("         colocale-check messages/*");
    process.exit(1);
  }

  console.log("🔍 Checking translation files...\n");

  let hasErrors = false;
  const checkedLocales: string[] = [];

  for (const arg of args) {
    const path = resolve(arg);

    // Arguments may be expanded by glob patterns
    try {
      const translations = await loadTranslationsFromDirectory(path);
      const result = validateTranslations(translations);

      // Extract locale name (last part of the path)
      const locale = path.split("/").pop() || path;
      checkedLocales.push(locale);

      printValidationResult(locale, result);

      if (!result.valid) {
        hasErrors = true;
      }
    } catch (error) {
      // Skip if directory doesn't exist
      continue;
    }
  }

  // Display summary
  console.log("\n" + "=".repeat(50));
  if (hasErrors) {
    console.log("❌ Validation failed: Errors found");
    process.exit(1);
  } else {
    console.log(
      `✅ Validation passed: All translation files are valid (${
        checkedLocales.length
      } locale${checkedLocales.length !== 1 ? "s" : ""})`
    );
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
