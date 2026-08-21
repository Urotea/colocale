import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
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

  test("Passes when all of several paths are valid", async () => {
    const a = await fixture("multi-a", { "en/common.json": VALID_EN });
    const b = await fixture("multi-b", { "ja/common.json": VALID_JA });
    const { exitCode, output } = runCheck(a, b);
    expect(output).toContain("Validation passed");
    expect(exitCode).toBe(0);
  });
});
