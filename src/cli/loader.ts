import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import type { TranslationFile } from "../types";

/**
 * Load all JSON files from a directory and merge into one TranslationFile
 */
export async function loadTranslationsFromDirectory(
  dir: string
): Promise<TranslationFile> {
  const translations: TranslationFile = {};

  try {
    const files = await readdir(dir);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const namespace = file.replace(".json", "");
        const filePath = join(dir, file);
        const content = await readFile(filePath, "utf-8");

        try {
          translations[namespace] = JSON.parse(content);
        } catch (error) {
          console.error(`❌ JSON parse error: ${filePath}`);
          if (error instanceof Error) {
            console.error(`   ${error.message}`);
          }
          process.exit(1);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Failed to read directory: ${dir}`);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }

  return translations;
}

/**
 * Type for locale-indexed translation files
 * Structure: { locale: { namespace: translations } }
 */
export type LocaleTranslations = Record<string, TranslationFile>;

/**
 * Load translations from multiple locale directories
 * Expected structure: basePath/[locale]/[namespace].json
 *
 * @param basePath - Base directory containing locale subdirectories
 * @returns Object with locale as key and TranslationFile as value
 */
export async function loadAllLocaleTranslations(
  basePath: string
): Promise<LocaleTranslations> {
  const localeTranslations: LocaleTranslations = {};

  try {
    const entries = await readdir(basePath);

    for (const entry of entries) {
      const entryPath = join(basePath, entry);
      const stats = await stat(entryPath);

      // Only process directories
      if (stats.isDirectory()) {
        const locale = entry;
        try {
          const translations = await loadTranslationsFromDirectory(entryPath);
          // Only add if there are any translations
          if (Object.keys(translations).length > 0) {
            localeTranslations[locale] = translations;
          }
        } catch (error) {
          // Skip directories that can't be read
          continue;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Failed to read base directory: ${basePath}`);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }

  return localeTranslations;
}
