#!/usr/bin/env node

import { resolve } from "node:path";
import { validateTranslations, validateCrossLocale } from "./validation";
import {
  loadTranslationsFromDirectory,
  loadAllLocaleTranslations,
} from "./cli/loader";
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
    console.error("         colocale-check messages  # checks all locales");
    process.exit(1);
  }

  console.log("🔍 Checking translation files...\n");

  let hasErrors = false;
  const checkedLocales: string[] = [];

  // Check if the first argument is a base directory containing locale subdirectories
  const firstArg = resolve(args[0]);
  let localeTranslations;

  try {
    localeTranslations = await loadAllLocaleTranslations(firstArg);

    if (Object.keys(localeTranslations).length > 0) {
      // Multi-locale mode: validate each locale and cross-locale consistency
      console.log(
        `📁 Found ${Object.keys(localeTranslations).length} locale(s)\n`
      );

      // Validate each locale individually
      for (const [locale, translations] of Object.entries(localeTranslations)) {
        const result = validateTranslations(translations);
        checkedLocales.push(locale);
        printValidationResult(locale, result);

        if (!result.valid) {
          hasErrors = true;
        }
      }

      // Perform cross-locale validation
      if (Object.keys(localeTranslations).length > 1) {
        console.log("\n" + "=".repeat(50));
        console.log("🌐 Cross-locale consistency check\n");

        const crossLocaleResult = validateCrossLocale(localeTranslations);
        printValidationResult("Cross-locale", crossLocaleResult);

        if (!crossLocaleResult.valid) {
          hasErrors = true;
        }
      }
    } else {
      throw new Error("No locales found");
    }
  } catch (error) {
    // Fallback to single-locale mode (original behavior)
    for (const arg of args) {
      const path = resolve(arg);

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
