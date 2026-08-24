import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { LocaleTranslations, TranslationFile } from "../types";

/** Extension of translation files; the namespace is the file name without it */
const JSON_EXTENSION = ".json";

/**
 * Store a value under a key that comes from the file system.
 *
 * A plain assignment cannot be used here: a file or directory literally named
 * `__proto__` would replace the target's prototype instead of adding an entry,
 * which silently drops the namespace and makes the prototype's keys show up in
 * every `for...in` over the result. `Object.defineProperty` bypasses the
 * `__proto__` setter and always creates a normal own property.
 */
function setEntry<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * Whether a directory name can be a locale at all.
 *
 * A BCP 47 language tag never starts with a dot, so tooling directories such as
 * `.vscode`, `.git` or `.idea` are not locale directories. They must not be
 * loaded as one, and must not be reported as a *broken* one either: they often
 * hold JSON that is not a translation file and does not even parse as JSON,
 * such as a `.vscode/settings.json` with comments.
 */
function isLocaleDirectoryName(name: string): boolean {
  return !name.startsWith(".");
}

/**
 * Load all JSON files from a directory and merge into one TranslationFile
 * @throws {Error} When directory cannot be read or JSON parsing fails
 */
export async function loadTranslationsFromDirectory(
  dir: string
): Promise<TranslationFile> {
  const translations: TranslationFile = {};

  let files: string[];
  try {
    files = await readdir(dir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read directory: ${dir} - ${message}`);
  }

  for (const file of files) {
    if (file.endsWith(JSON_EXTENSION)) {
      // Strip the trailing extension only: "my.json.backup.json" -> "my.json.backup"
      const namespace = file.slice(0, -JSON_EXTENSION.length);
      const filePath = join(dir, file);

      let content: string;
      try {
        content = await readFile(filePath, "utf-8");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read file: ${filePath} - ${message}`);
      }

      try {
        setEntry(translations, namespace, JSON.parse(content));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`JSON parse error in ${filePath}: ${message}`);
      }
    }
  }

  return translations;
}

/**
 * A locale subdirectory that holds translation files but could not be loaded
 */
export interface LocaleLoadFailure {
  /** Directory name, which would have been the locale */
  locale: string;
  /** Full path of the directory */
  path: string;
  /** Reason the directory could not be loaded */
  message: string;
}

/**
 * Outcome of scanning a base directory for locale subdirectories
 */
export interface LocaleLoadResult {
  /** Locales that were loaded successfully */
  localeTranslations: LocaleTranslations;
  /**
   * Locale subdirectories that exist but could not be loaded, e.g. because a
   * translation file has a JSON syntax error.
   *
   * Callers must treat a non-empty list as an error. A locale that silently
   * disappears from `localeTranslations` is neither validated nor compared
   * against the other locales, so ignoring these makes broken input look valid.
   */
  failures: LocaleLoadFailure[];
}

/**
 * Load translations from multiple locale directories
 * Expected structure: basePath/[locale]/[namespace].json
 *
 * Subdirectories without any `.json` file are not locale directories and are
 * skipped silently. Subdirectories that do hold translation files but fail to
 * load are reported in `failures` instead of being dropped.
 *
 * @param basePath - Base directory containing locale subdirectories
 * @returns Successfully loaded locales plus the locales that failed to load
 * @throws {Error} When base directory cannot be read
 */
export async function loadAllLocaleTranslations(
  basePath: string
): Promise<LocaleLoadResult> {
  const localeTranslations: LocaleTranslations = {};
  const failures: LocaleLoadFailure[] = [];

  let entries: string[];
  try {
    entries = await readdir(basePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read directory: ${basePath} - ${message}`);
  }

  for (const entry of entries) {
    if (!isLocaleDirectoryName(entry)) {
      continue;
    }

    const entryPath = join(basePath, entry);

    let stats;
    try {
      stats = await stat(entryPath);
    } catch (_error) {
      // Skip entries that can't be accessed
      continue;
    }

    // Only process directories
    if (stats.isDirectory()) {
      const locale = entry;
      try {
        const translations = await loadTranslationsFromDirectory(entryPath);
        // A directory without any .json file is not a locale directory at all
        if (Object.keys(translations).length > 0) {
          setEntry(localeTranslations, locale, translations);
        }
      } catch (error) {
        // Record instead of skip: a locale that cannot be parsed must not
        // vanish from the result, or callers report it as nothing to validate
        failures.push({
          locale,
          path: entryPath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return { localeTranslations, failures };
}

/**
 * Get the first locale directory from a base directory
 * A locale directory is one that contains JSON translation files.
 * Returns the first valid locale directory found (order depends on filesystem).
 *
 * @param basePath - Base directory that may contain locale subdirectories
 * @returns Path to the first locale directory found, or null if none found
 */
export async function getFirstLocaleDirectory(
  basePath: string
): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(basePath);
  } catch (_error) {
    return null;
  }

  for (const entry of entries) {
    if (!isLocaleDirectoryName(entry)) {
      continue;
    }

    const entryPath = join(basePath, entry);

    let stats;
    try {
      stats = await stat(entryPath);
    } catch (_error) {
      continue;
    }

    // Only process directories
    if (stats.isDirectory()) {
      // Check if directory contains JSON files (translation files)
      try {
        const files = await readdir(entryPath);
        const hasJsonFiles = files.some((file) =>
          file.endsWith(JSON_EXTENSION)
        );
        if (hasJsonFiles) {
          return entryPath;
        }
      } catch (_error) {
        // Skip directories that can't be read
        continue;
      }
    }
  }

  return null;
}
