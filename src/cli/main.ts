#!/usr/bin/env node

import { Command } from "commander";
import { resolve, dirname } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { validateTranslations, validateCrossLocale } from "../validation";
import {
  loadTranslationsFromDirectory,
  loadAllLocaleTranslations,
} from "./loader";
import { printValidationResult } from "./formatter";
import { generateTypescriptInterface } from "./codegen";

const program = new Command();

program
  .name("colocale")
  .description("CLI tool for i18n translation management")
  .version("0.1.0");

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
    const checkedLocales: string[] = [];

    // Check if the first argument is a base directory containing locale subdirectories
    const firstArg = resolve(paths[0]);
    let localeTranslations;

    try {
      localeTranslations = await loadAllLocaleTranslations(firstArg);

      if (Object.keys(localeTranslations).length > 0) {
        // Multi-locale mode: validate each locale and cross-locale consistency
        console.log(
          `📁 Found ${Object.keys(localeTranslations).length} locale(s)\n`
        );

        // Validate each locale individually
        for (const [locale, translations] of Object.entries(
          localeTranslations
        )) {
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
    } catch {
      // Fallback to single-locale mode (original behavior)
      for (const arg of paths) {
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
          console.error(
            `❌ ${error instanceof Error ? error.message : String(error)}`
          );
          process.exit(1);
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
  });

/**
 * Codegen command - generates TypeScript type definitions
 */
program
  .command("codegen")
  .description("Generate TypeScript type definitions from translation files")
  .argument("<path>", "Path to translation directory")
  .argument("[output]", "Output file path", "messages.types.ts")
  .action(async (translationPath: string, outputPath: string) => {
    const resolvedTranslationPath = resolve(translationPath);
    const resolvedOutputPath = resolve(outputPath);

    console.log("🔧 Generating TypeScript types from translations...\n");
    console.log(`📁 Input:  ${resolvedTranslationPath}`);
    console.log(`📄 Output: ${resolvedOutputPath}\n`);

    try {
      // Load translations
      const translations = await loadTranslationsFromDirectory(
        resolvedTranslationPath
      );

      // Generate TypeScript interface
      const interfaceCode = generateTypescriptInterface(
        translations,
        "TranslationStructure"
      );

      // Ensure output directory exists
      await mkdir(dirname(resolvedOutputPath), { recursive: true });

      // Write to file
      await writeFile(resolvedOutputPath, interfaceCode, "utf-8");

      console.log("✅ Type definitions generated successfully!");
      console.log(`\nYou can now import and use the generated types:`);
      console.log(
        `  import type { TranslationStructure, TranslationKey } from "${resolvedOutputPath.replace(
          process.cwd() + "/",
          "./"
        )}";`
      );
    } catch (error) {
      console.error("❌ Error generating types:", error);
      process.exit(1);
    }
  });

program.parse();
