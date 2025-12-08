#!/usr/bin/env node

/**
 * Migration script to flatten nested translation JSON files
 * Converts from level 1 nested structure to level 0 flat structure
 *
 * Before:
 * {
 *   "profile": {
 *     "name": "Name",
 *     "email": "Email"
 *   }
 * }
 *
 * After:
 * {
 *   "profile.name": "Name",
 *   "profile.email": "Email"
 * }
 */

import fs from 'fs';
import path from 'path';

/**
 * Flatten a nested object into dot-notation keys
 * @param {Object} obj - The object to flatten
 * @param {string} prefix - The prefix for keys
 * @returns {Object} Flattened object
 */
function flattenObject(obj, prefix = '') {
  const result = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      // Value is a string, add it directly
      result[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      // Value is an object, flatten it recursively (only 1 level deep)
      for (const nestedKey in value) {
        const nestedValue = value[nestedKey];
        if (typeof nestedValue === 'string') {
          result[`${newKey}.${nestedKey}`] = nestedValue;
        } else {
          console.warn(`Warning: Skipping deeply nested value at ${newKey}.${nestedKey}`);
        }
      }
    }
  }

  return result;
}

/**
 * Process a single JSON file
 * @param {string} filePath - Path to the JSON file
 */
function processFile(filePath) {
  console.log(`Processing: ${filePath}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Flatten the object
    const flattened = flattenObject(data);

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(flattened, null, 2) + '\n', 'utf8');
    console.log(`✓ Converted: ${filePath}`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`✗ JSON parsing error in ${filePath}:`, error.message);
    } else {
      console.error(`✗ Error processing ${filePath}:`, error.message);
    }
  }
}

/**
 * Recursively find all JSON files in a directory
 * @param {string} dir - Directory path
 * @returns {string[]} Array of JSON file paths
 */
function findJsonFiles(dir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node flatten-translations.js <directory>');
    console.error('Example: node flatten-translations.js ./messages');
    process.exit(1);
  }

  const targetDir = args[0];

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory not found: ${targetDir}`);
    process.exit(1);
  }

  console.log(`Flattening translation files in: ${targetDir}\n`);

  const jsonFiles = findJsonFiles(targetDir);

  if (jsonFiles.length === 0) {
    console.log('No JSON files found.');
    return;
  }

  console.log(`Found ${jsonFiles.length} JSON file(s)\n`);

  for (const file of jsonFiles) {
    processFile(file);
  }

  console.log('\n✓ Migration complete!');
}

main();
