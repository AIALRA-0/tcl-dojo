import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function loadCourseData() {
  const source = await readFile(new URL("app/course-data.ts", root), "utf8");
  const { transform } = await import("esbuild");
  const compiled = await transform(source, {
    format: "esm",
    loader: "ts",
    target: "es2022",
  });
  const encoded = Buffer.from(compiled.code).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

test("ships the complete 9-module, 44-lesson, 128-challenge course", async () => {
  const source = await readFile(new URL("app/course-data.ts", root), "utf8");
  const moduleIds = [...source.matchAll(/^\s{4}id: "([^"]+)",$/gm)].map(
    (match) => match[1],
  );
  const lessonIds = [...source.matchAll(/^\s{8}"([a-z0-9-]+)",\n\s{8}"\d{2}",/gm)].map(
    (match) => match[1],
  );
  const challengeIds = [
    ...source.matchAll(/^\s{12}"([a-z0-9-]+)",\n\s{12}"(?:observe|predict|edit|repair|create|capstone)",/gm),
  ].map((match) => match[1]);

  assert.equal(moduleIds.length, 9);
  assert.equal(lessonIds.length, 44);
  assert.equal(challengeIds.length, 128);
  assert.equal(new Set(moduleIds).size, moduleIds.length);
  assert.equal(new Set(lessonIds).size, lessonIds.length);
  assert.equal(new Set(challengeIds).size, challengeIds.length);
  assert.match(source, /challenges: allChallenges\.length/);
  assert.match(source, /capstones: allChallenges\.filter/);
});

test("every task has a complete, internally consistent answer contract", async () => {
  const { allChallenges, allLessons } = await loadCourseData();
  const projectLessons = allLessons.filter((lesson) => lesson.project);

  assert.equal(projectLessons.length, 6);
  for (const lesson of projectLessons) {
    assert.ok(lesson.project.setting);
    assert.ok(lesson.project.input);
    assert.ok(lesson.project.deliverable);
    assert.ok(lesson.project.acceptance.length >= 3);
  }

  for (const challenge of allChallenges) {
    assert.ok(challenge.solution.trim(), `${challenge.id} has no solution`);
    if (challenge.kind === "predict") {
      assert.ok(challenge.options?.length >= 2, `${challenge.id} has no options`);
      assert.ok(
        Number.isInteger(challenge.answer) &&
          challenge.answer >= 0 &&
          challenge.answer < challenge.options.length,
        `${challenge.id} has an invalid answer`,
      );
    } else {
      assert.ok(challenge.expectation, `${challenge.id} has no run expectation`);
    }
  }
});

test("ships a real Tcl WebAssembly runtime and its license files", async () => {
  const required = [
    ["public/vendor/wacl/tcl/wacl.js", 200_000],
    ["public/vendor/wacl/tcl/wacl.wasm", 1_000_000],
    ["public/vendor/wacl/tcl/wacl-library.data", 2_000_000],
    ["public/vendor/wacl/LICENSE", 1_000],
    ["public/vendor/wacl/license.terms", 1_000],
  ];

  for (const [path, minimumSize] of required) {
    const info = await stat(new URL(path, root));
    assert.ok(info.size > minimumSize, `${path} is unexpectedly small`);
  }
});

test("keeps execution isolated and bounded", async () => {
  const [worker, hook] = await Promise.all([
    readFile(new URL("public/tcl-worker.js", root), "utf8"),
    readFile(new URL("app/use-tcl-runtime.ts", root), "utf8"),
  ]);

  assert.match(worker, /interp create dojo/);
  assert.match(worker, /interp delete dojo/);
  assert.match(worker, /interp hide dojo exit/);
  assert.match(worker, /get_timing_paths/);
  assert.match(worker, /report_timing_summary/);
  assert.match(hook, /}, 2000\)/);
  assert.match(hook, /workerRef\.current\?\.terminate/);
});
