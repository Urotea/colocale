#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { Command } from "commander";
import { validateCrossLocale, validateTranslations } from "../validation";
import { generateTypescriptInterface } from "./codegen";
import { printSummary, printValidationResult } from "./formatter";
import {
  getFirstLocaleDirectory,
  loadAllLocaleTranslations,
  loadTranslationsFromDirectory,
} from "./loader";

const program = new Command();

program
  .name("colocale")
  .description("CLI tool for i18n translation management")
  // Keep in sync with the "version" field of package.json. It cannot be
  // imported: package.json sits outside tsconfig's rootDir ("./src").
  .version("0.1.1");

/**
 * Result of validating a single path
 */
interface CheckOutcome {
  hasErrors: boolean;
  checkedLocales: string[];
}

/**
 * Validate one path, which is either a base directory containing locale
 * subdirectories (multi-locale mode) or a single locale directory.
 *
 * @throws {Error} When the path cannot be read, when it contains no translation
 * files at all, or when none of its locale subdirectories could be loaded - an
 * empty path is never reported as valid.
 */
async function checkPath(path: string): Promise<CheckOutcome> {
  const checkedLocales: string[] = [];
  let hasErrors = false;

  // Multi-locale mode: the path is a base directory of locale subdirectories
  const { localeTranslations, failures } =
    await loadAllLocaleTranslations(path);
  const locales = Object.keys(localeTranslations);

  // A locale that failed to load still means the path holds locale
  // subdirectories, so it selects multi-locale mode exactly like a loaded one.
  // Falling through to single-locale mode here would validate the base
  // directory, which has no translation files of its own, and report success.
  if (locales.length > 0 || failures.length > 0) {
    console.log(`📁 Found ${locales.length + failures.length} locale(s)\n`);

    // Validate each locale individually
    for (const [locale, translations] of Object.entries(localeTranslations)) {
      const result = validateTranslations(translations);
      checkedLocales.push(locale);
      printValidationResult(locale, result);

      if (!result.valid) {
        hasErrors = true;
      }
    }

    // A locale that could not be loaded is an error, never an absent locale:
    // nothing validates it and nothing compares against it, so swallowing it
    // is what used to report a tree with a broken locale as valid.
    for (const failure of failures) {
      console.error(`📁 ${failure.locale}`);
      console.error(`  ❌ Failed to load: ${failure.message}\n`);
      hasErrors = true;
    }

    if (locales.length === 0) {
      throw new Error(
        `Found locale subdirectories in ${path}, but none of them could be loaded. Fix the errors above and run check again.`
      );
    }

    // Perform cross-locale validation over the locales that did load
    if (locales.length > 1) {
      console.log("\n" + "=".repeat(50));
      console.log("🌐 Cross-locale consistency check\n");

      if (failures.length > 0) {
        console.log(
          `⚠️  ${failures.length} locale(s) could not be loaded and are excluded from this comparison.\n`
        );
      }

      const crossLocaleResult = validateCrossLocale(localeTranslations);
      printValidationResult("Cross-locale", crossLocaleResult);

      if (!crossLocaleResult.valid) {
        hasErrors = true;
      }
    } else if (failures.length > 0) {
      // Do not blame the project structure for a check skipped by a load error
      console.log(
        `\nℹ️  Cross-locale consistency check skipped: only 1 of ${
          locales.length + failures.length
        } locales could be loaded.`
      );
    } else {
      console.log(
        "\nℹ️  Only one locale was loaded, so the cross-locale consistency check was skipped."
      );
    }

    return { hasErrors, checkedLocales };
  }

  // No subdirectory held a translation file, so there is no locale subdirectory
  // to report on. Single-locale mode: the path itself is a locale directory
  const translations = await loadTranslationsFromDirectory(path);
  if (Object.keys(translations).length === 0) {
    throw new Error(
      `No translation files found in ${path}. Expected .json translation files in this directory, or locale subdirectories containing them.`
    );
  }

  const result = validateTranslations(translations);

  // Extract locale name (last part of the path)
  const locale = basename(path) || path;
  checkedLocales.push(locale);

  printValidationResult(locale, result);

  if (!result.valid) {
    hasErrors = true;
  }

  return { hasErrors, checkedLocales };
}

/**
 * Check command - validates translation files
 */
program
  .command("check")
  .description("Validate translation files for consistency and correctness")
  .argument(
    "<paths...>",
    "Path(s) to translation directory or directories to validate"
  )
  .action(async (paths: string[]) => {
    console.log("🔍 Checking translation files...\n");

    let hasErrors = false;
    // Keyed by path so the same locale in two different trees counts twice
    // while the same path passed twice does not
    const checkedLocales = new Set<string>();

    // Every path is validated; none is silently ignored
    for (const arg of paths) {
      const path = resolve(arg);

      if (paths.length > 1) {
        console.log(`📂 ${path}`);
      }

      try {
        const outcome = await checkPath(path);
        for (const locale of outcome.checkedLocales) {
          checkedLocales.add(`${path}\u0000${locale}`);
        }

        if (outcome.hasErrors) {
          hasErrors = true;
        }
      } catch (error) {
        console.error(
          `❌ ${error instanceof Error ? error.message : String(error)}`
        );
        hasErrors = true;
      }

      if (paths.length > 1) {
        console.log("");
      }
    }

    printSummary(hasErrors, checkedLocales.size);
    process.exit(hasErrors ? 1 : 0);
  });

/**
 * Codegen command - generates type-safe defineRequirement function
 */
program
  .command("codegen")
  .description(
    "Generate type-safe defineRequirement function from translation files"
  )
  .argument(
    "<path>",
    "Path to translation directory (parent directory containing locale subdirectories)"
  )
  .argument("[output]", "Output file path", "defineRequirement.ts")
  .action(async (translationPath: string, outputPath: string) => {
    const resolvedTranslationPath = resolve(translationPath);
    const resolvedOutputPath = resolve(outputPath);

    console.log("🔧 Generating type-safe defineRequirement function...\n");
    console.log(`📁 Input:  ${resolvedTranslationPath}`);

    try {
      // Try to find a locale subdirectory first
      const localeDir = await getFirstLocaleDirectory(resolvedTranslationPath);

      let translations;

      if (localeDir) {
        // Found locale subdirectories, use the first one
        const localeName = basename(localeDir);
        console.log(
          `📁 Detected locale subdirectories, using locale: ${localeName}`
        );
        translations = await loadTranslationsFromDirectory(localeDir);
      } else {
        // No locale subdirectories found, try to load directly
        translations = await loadTranslationsFromDirectory(
          resolvedTranslationPath
        );
      }

      console.log(`📄 Output: ${resolvedOutputPath}\n`);

      // Generate TypeScript interface
      const interfaceCode = generateTypescriptInterface(translations);

      // Ensure output directory exists
      await mkdir(dirname(resolvedOutputPath), { recursive: true });

      // Write to file
      await writeFile(resolvedOutputPath, interfaceCode, "utf-8");

      console.log("✅ Generated successfully!");
    } catch (error) {
      console.error("❌ Error generating code:", error);
      process.exit(1);
    }
  });

program.parse();
