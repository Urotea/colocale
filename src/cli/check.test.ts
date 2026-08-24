import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAIN = join(import.meta.dir, "main.ts");

let root: string;

/** Create a translation directory tree: { "en/common.json": '{"a":"b"}' } */
async function fixture(
  name: string,
  files: Record<string, string>
): Promise<string> {
  const dir = join(root, name);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = join(dir, relativePath);
    mkdirSync(join(filePath, ".."), { recursive: true });
    await writeFile(filePath, content, "utf-8");
  }
  mkdirSync(dir, { recursive: true });
  return dir;
}

function runCheck(...paths: string[]): { exitCode: number; output: string } {
  const result = Bun.spawnSync([
    process.execPath,
    "run",
    MAIN,
    "check",
    ...paths,
  ]);
  return {
    exitCode: result.exitCode,
    output: result.stdout.toString() + result.stderr.toString(),
  };
}

const VALID_EN = JSON.stringify({ submit: "Submit", cancel: "Cancel" });
const VALID_JA = JSON.stringify({ submit: "送信", cancel: "キャンセル" });

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "colocale-check-"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("colocale check", () => {
  test("Passes on a valid multi-locale tree", async () => {
    const dir = await fixture("valid", {
      "en/common.json": VALID_EN,
      "ja/common.json": VALID_JA,
    });
    const { exitCode, output } = runCheck(dir);
    expect(output).toContain("Found 2 locale(s)");
    expect(output).toContain("Cross-locale");
    expect(exitCode).toBe(0);
  });

  test("Passes on a single locale directory", async () => {
    const dir = await fixture("single", { "en/common.json": VALID_EN });
    const { exitCode, output } = runCheck(join(dir, "en"));
    expect(output).toContain("Validation passed");
    expect(exitCode).toBe(0);
  });

  test("Fails when every locale contains invalid JSON", async () => {
    const dir = await fixture("all-broken", {
      "en/common.json": '{ "submit": "Submit", BROKEN',
      "ja/common.json": "not json at all",
    });
    const { exitCode, output } = runCheck(dir);
    expect(output).toContain("none of them could be loaded");
    expect(output).toContain("Validation failed");
    expect(exitCode).toBe(1);
  });

  test("Fails when only one of several locales contains invalid JSON", async () => {
    const dir = await fixture("partially-broken", {
      "en/common.json": VALID_EN,
      "ja/common.json": '{ "submit": "送信", BROKEN',
    });

    const { exitCode, output } = runCheck(dir);

    // The broken locale must be named, not quietly dropped from the run
    expect(output).toContain("Found 2 locale(s)");
    expect(output).toContain("Failed to load");
    expect(output).toContain("ja");
    expect(output).toContain("Validation failed");
    expect(output).not.toContain("Validation passed");
    expect(exitCode).toBe(1);
  });

  // Running as root bypasses the permission bits, so the directory stays readable
  const asRoot = process.getuid?.() === 0;

  test.skipIf(asRoot)(
    "Fails when a locale directory cannot be read",
    async () => {
      const dir = await fixture("unreadable-locale", {
        "en/common.json": VALID_EN,
        "ja/common.json": VALID_JA,
      });
      const jaDir = join(dir, "ja");
      chmodSync(jaDir, 0o000);

      try {
        const { exitCode, output } = runCheck(dir);
        expect(output).toContain("Failed to load");
        expect(exitCode).toBe(1);
      } finally {
        chmodSync(jaDir, 0o755);
      }
    }
  );

  test("Still compares the locales that did load when another one is broken", async () => {
    const dir = await fixture("partially-broken-cross", {
      "en/common.json": VALID_EN,
      "fr/common.json": JSON.stringify({ submit: "Envoyer" }),
      "ja/common.json": "not json at all",
    });

    const { exitCode, output } = runCheck(dir);

    // fr is missing "cancel", which the cross-locale check must still catch
    expect(output).toContain("Cross-locale");
    expect(output).toContain("excluded from this comparison");
    expect(output).toContain("cancel");
    expect(exitCode).toBe(1);
  });

  test("Ignores dot-directories that hold non-translation JSON", async () => {
    const dir = await fixture("dot-dir", {
      "en/common.json": VALID_EN,
      "ja/common.json": VALID_JA,
      // Valid JSONC, invalid JSON - and not a locale, so it must not fail
      ".vscode/settings.json": '{\n  // a comment\n  "editor.tabSize": 2\n}',
    });

    const { exitCode, output } = runCheck(dir);
    expect(output).toContain("Found 2 locale(s)");
    expect(output).not.toContain(".vscode");
    expect(exitCode).toBe(0);
  });

  test("Fails when a directory holds no translation files", async () => {
    const dir = await fixture("empty", { "notes.txt": "not a translation" });
    const { exitCode, output } = runCheck(dir);
    expect(output).toContain("No translation files found");
    expect(exitCode).toBe(1);
  });

  test("Fails when the path does not exist", () => {
    const { exitCode, output } = runCheck(join(root, "does-not-exist"));
    expect(output).toContain("Failed to read directory");
    expect(exitCode).toBe(1);
  });

  test("Validates every path, not only the first one", async () => {
    const good = await fixture("multi-good", { "en/common.json": VALID_EN });
    const bad = await fixture("multi-bad", {
      "en/common.json": JSON.stringify({ "bad key!": "x" }),
    });

    // The invalid path alone must fail
    expect(runCheck(bad).exitCode).toBe(1);

    // ...and it must still fail when it is not the first argument
    const { exitCode, output } = runCheck(good, bad);
    expect(output).toContain("Invalid key name");
    expect(exitCode).toBe(1);
  });

  test("Reports errors from every path, including later ones", async () => {
    const good = await fixture("report-good", { "en/common.json": VALID_EN });
    const { exitCode, output } = runCheck(good, join(root, "missing-dir"));
    expect(output).toContain("report-good");
    expect(output).toContain("missing-dir");
    expect(exitCode).toBe(1);
  });

  test("Does not invent errors for a namespace named __proto__", async () => {
    const dir = await fixture("proto", {
      "en/common.json": VALID_EN,
      "en/__proto__.json": JSON.stringify({ submit: "Submit" }),
      "ja/common.json": VALID_JA,
      "ja/__proto__.json": JSON.stringify({ submit: "送信" }),
    });

    const { exitCode, output } = runCheck(dir);
    expect(output).toContain("Found 2 locale(s)");
    expect(output).not.toContain("Invalid key name");
    expect(exitCode).toBe(0);
  });

  test("Passes when all of several paths are valid", async () => {
    const a = await fixture("multi-a", { "en/common.json": VALID_EN });
    const b = await fixture("multi-b", { "ja/common.json": VALID_JA });
    const { exitCode, output } = runCheck(a, b);
    expect(output).toContain("Validation passed");
    expect(exitCode).toBe(0);
  });
});
