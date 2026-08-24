import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getFirstLocaleDirectory,
  loadAllLocaleTranslations,
  loadTranslationsFromDirectory,
} from "./loader";

let root: string;

/** Create a directory tree: { "en/common.json": '{"a":"b"}' } */
async function fixture(
  name: string,
  files: Record<string, string>
): Promise<string> {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(dir, relativePath);
    mkdirSync(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, content, "utf-8");
  }

  return dir;
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "colocale-loader-"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("loadTranslationsFromDirectory", () => {
  test("Uses the file name as the namespace", async () => {
    const dir = await fixture("basic", {
      "common.json": JSON.stringify({ submit: "Submit" }),
      "user.json": JSON.stringify({ "profile.name": "Name" }),
    });

    expect(await loadTranslationsFromDirectory(dir)).toEqual({
      common: { submit: "Submit" },
      user: { "profile.name": "Name" },
    });
  });

  test("Strips only the trailing .json extension", async () => {
    const dir = await fixture("dotted-names", {
      "my.json.backup.json": JSON.stringify({ a: "1" }),
      "shop.items.json": JSON.stringify({ b: "2" }),
    });

    expect(
      Object.keys(await loadTranslationsFromDirectory(dir)).sort()
    ).toEqual(["my.json.backup", "shop.items"]);
  });

  test("Ignores files that are not .json", async () => {
    const dir = await fixture("mixed", {
      "common.json": JSON.stringify({ submit: "Submit" }),
      "README.md": "# not a translation",
      "common.yaml": "submit: Submit",
    });

    expect(Object.keys(await loadTranslationsFromDirectory(dir))).toEqual([
      "common",
    ]);
  });

  test("Returns an empty object for a directory without .json files", async () => {
    const dir = await fixture("no-json", { "notes.txt": "nothing here" });
    expect(await loadTranslationsFromDirectory(dir)).toEqual({});
  });

  test("Throws with the file path when JSON is invalid", async () => {
    const dir = await fixture("broken-json", {
      "common.json": '{ "submit": "Submit", BROKEN',
    });

    await expect(loadTranslationsFromDirectory(dir)).rejects.toThrow(
      /JSON parse error in .*common\.json/
    );
  });

  test("Throws when the directory cannot be read", async () => {
    await expect(
      loadTranslationsFromDirectory(join(root, "does-not-exist"))
    ).rejects.toThrow(/Failed to read directory/);
  });
});

describe("loadAllLocaleTranslations", () => {
  test("Groups translations by locale directory name", async () => {
    const dir = await fixture("locales", {
      "en/common.json": JSON.stringify({ submit: "Submit" }),
      "ja/common.json": JSON.stringify({ submit: "送信" }),
      "pt-BR/common.json": JSON.stringify({ submit: "Enviar" }),
    });

    expect(await loadAllLocaleTranslations(dir)).toEqual({
      localeTranslations: {
        en: { common: { submit: "Submit" } },
        ja: { common: { submit: "送信" } },
        "pt-BR": { common: { submit: "Enviar" } },
      },
      failures: [],
    });
  });

  test("Ignores top-level files and subdirectories without .json files", async () => {
    const dir = await fixture("noise", {
      "en/common.json": JSON.stringify({ submit: "Submit" }),
      "README.md": "# docs",
      "scripts/build.sh": "echo hi",
    });

    const { localeTranslations, failures } =
      await loadAllLocaleTranslations(dir);
    expect(Object.keys(localeTranslations)).toEqual(["en"]);
    expect(failures).toEqual([]);
  });

  test("Reports a locale whose files cannot be parsed instead of dropping it", async () => {
    const dir = await fixture("partially-broken", {
      "en/common.json": JSON.stringify({ submit: "Submit" }),
      "ja/common.json": "not json at all",
    });

    const { localeTranslations, failures } =
      await loadAllLocaleTranslations(dir);

    // The broken locale must not simply disappear from the result: callers
    // cannot tell "no such locale" apart from "this locale is broken" then
    expect(Object.keys(localeTranslations)).toEqual(["en"]);
    expect(failures).toHaveLength(1);
    expect(failures[0].locale).toBe("ja");
    expect(failures[0].path).toBe(join(dir, "ja"));
    expect(failures[0].message).toMatch(/JSON parse error in .*common\.json/);
  });

  test("Reports every locale that cannot be parsed", async () => {
    const dir = await fixture("all-broken-loader", {
      "en/common.json": "{ BROKEN",
      "ja/common.json": "also not json",
    });

    const { localeTranslations, failures } =
      await loadAllLocaleTranslations(dir);

    expect(localeTranslations).toEqual({});
    expect(failures.map((failure) => failure.locale).sort()).toEqual([
      "en",
      "ja",
    ]);
  });

  test("A dot-directory is neither a locale nor a failure", async () => {
    const dir = await fixture("dot-dirs", {
      "en/common.json": JSON.stringify({ submit: "Submit" }),
      // Not JSON at all, and not a translation file either
      ".vscode/settings.json": '{\n  // a comment\n  "editor.tabSize": 2\n}',
      ".git/config.json": JSON.stringify({ some: "value" }),
    });

    const { localeTranslations, failures } =
      await loadAllLocaleTranslations(dir);

    expect(Object.keys(localeTranslations)).toEqual(["en"]);
    expect(failures).toEqual([]);
  });

  test("A subdirectory without .json files is not reported as a failure", async () => {
    const dir = await fixture("not-a-locale", {
      "en/common.json": JSON.stringify({ submit: "Submit" }),
      "scripts/build.sh": "echo hi",
    });

    const { failures } = await loadAllLocaleTranslations(dir);
    expect(failures).toEqual([]);
  });

  test("Throws when the base directory cannot be read", async () => {
    await expect(
      loadAllLocaleTranslations(join(root, "does-not-exist"))
    ).rejects.toThrow(/Failed to read directory/);
  });
});

describe("file system names that could pollute prototypes", () => {
  test("A file named __proto__.json becomes a normal namespace", async () => {
    const dir = await fixture("proto-file", {
      "common.json": JSON.stringify({ submit: "Submit" }),
      "__proto__.json": JSON.stringify({ POLLUTED: "yes" }),
    });

    const translations = await loadTranslationsFromDirectory(dir);

    expect(Object.keys(translations).sort()).toEqual(["__proto__", "common"]);
    expect(Object.getPrototypeOf(translations)).toBe(Object.prototype);

    // Stored as a plain own data property, not as the object's prototype
    const entry = Object.getOwnPropertyDescriptor(translations, "__proto__");
    expect(entry?.value).toEqual({ POLLUTED: "yes" });

    // The keys of the loaded file must not appear as phantom namespaces
    const enumerated: string[] = [];
    for (const namespace in translations) {
      enumerated.push(namespace);
    }
    expect(enumerated.sort()).toEqual(["__proto__", "common"]);
  });

  test("A locale directory named __proto__ becomes a normal locale", async () => {
    const dir = await fixture("proto-dir", {
      "en/common.json": JSON.stringify({ submit: "Submit" }),
      "__proto__/common.json": JSON.stringify({ submit: "Polluted" }),
    });

    const { localeTranslations } = await loadAllLocaleTranslations(dir);

    expect(Object.keys(localeTranslations).sort()).toEqual(["__proto__", "en"]);
    expect(Object.getPrototypeOf(localeTranslations)).toBe(Object.prototype);

    const entry = Object.getOwnPropertyDescriptor(
      localeTranslations,
      "__proto__"
    );
    expect(entry?.value).toEqual({ common: { submit: "Polluted" } });
  });
});

describe("getFirstLocaleDirectory", () => {
  test("Returns a subdirectory that contains .json files", async () => {
    const dir = await fixture("with-locale", {
      "en/common.json": JSON.stringify({ submit: "Submit" }),
    });

    expect(await getFirstLocaleDirectory(dir)).toBe(join(dir, "en"));
  });

  test("Skips dot-directories when picking the reference locale", async () => {
    const dir = await fixture("dot-dir-first", {
      ".vscode/settings.json": JSON.stringify({ "editor.tabSize": 2 }),
      "en/common.json": JSON.stringify({ submit: "Submit" }),
    });

    expect(await getFirstLocaleDirectory(dir)).toBe(join(dir, "en"));
  });

  test("Returns null when no subdirectory contains .json files", async () => {
    const dir = await fixture("without-locale", {
      "common.json": JSON.stringify({ submit: "Submit" }),
      "scripts/build.sh": "echo hi",
    });

    expect(await getFirstLocaleDirectory(dir)).toBeNull();
  });

  test("Returns null when the path cannot be read", async () => {
    expect(
      await getFirstLocaleDirectory(join(root, "does-not-exist"))
    ).toBeNull();
  });
});
