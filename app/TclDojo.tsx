"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  allChallenges,
  allLessons,
  commandReference,
  courseModules,
  courseStats,
  findLesson,
} from "./course-data";
import type {
  Challenge,
  ChallengeKind,
  Lesson,
  TclRunResult,
} from "./course-types";
import { useTclRuntime } from "./use-tcl-runtime";

const PROGRESS_KEY = "tcl-dojo-progress-v2";
const DRAFTS_KEY = "tcl-dojo-drafts-v2";
const RECENT_KEY = "tcl-dojo-recent-v2";

const kindLabels: Record<ChallengeKind, string> = {
  observe: "观察",
  predict: "预测",
  edit: "改写",
  repair: "修错",
  create: "独立写",
  capstone: "综合",
};

const designObjects = {
  ports: ["sys_clk", "reset_n", "out_data", "out_valid", "irq", "debug_bus"],
  cells: [
    "u_cpu",
    "u_cpu/state_reg",
    "u_cpu/data_lut",
    "u_dma",
    "u_dma/count_reg",
    "u_uart/rx_reg",
    "u_mem/valid_reg",
  ],
  nets: ["data_bus", "state_q", "dma_next", "out_data"],
  paths: ["path_0", "path_1", "path_2"],
};

function validateRun(challenge: Challenge, result: TclRunResult) {
  const expected = challenge.expectation;
  if (!expected) return false;

  if (expected.errorIncludes) {
    return (result.error ?? "")
      .toLowerCase()
      .includes(expected.errorIncludes.toLowerCase());
  }

  if (result.error) return false;
  const output = result.output.map((line) => line.trim());

  if (
    expected.outputExact &&
    (output.length !== expected.outputExact.length ||
      expected.outputExact.some((line, index) => output[index] !== line))
  ) {
    return false;
  }

  if (
    expected.outputIncludes &&
    !expected.outputIncludes.every((fragment) =>
      output.some((line) => line.includes(fragment)),
    )
  ) {
    return false;
  }

  if (
    expected.resultEquals !== undefined &&
    result.result !== expected.resultEquals
  ) {
    return false;
  }

  if (
    expected.traceCommands &&
    !expected.traceCommands.every((command) =>
      result.trace.some((event) => event.command === command),
    )
  ) {
    return false;
  }

  return true;
}

function usePersistentProgress() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "[]");
      // Browser storage is an external system; hydration intentionally happens
      // after the server-rendered shell mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(stored)) setCompleted(new Set(stored));
    } catch {
      localStorage.removeItem(PROGRESS_KEY);
    }
    setHydrated(true);
  }, []);

  const complete = useCallback((id: string) => {
    setCompleted((current) => {
      const next = new Set(current);
      next.add(id);
      localStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCompleted(new Set());
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(DRAFTS_KEY);
    localStorage.removeItem(RECENT_KEY);
  }, []);

  return { completed, complete, reset, hydrated };
}

function challengePosition(lesson: Lesson, challengeIndex: number) {
  const lessonIndex = allLessons.findIndex((item) => item.id === lesson.id);
  const before = allLessons
    .slice(0, lessonIndex)
    .reduce((sum, item) => sum + item.challenges.length, 0);
  return before + challengeIndex + 1;
}

function lineCount(code: string) {
  return Math.max(1, code.split("\n").length);
}

function TclEvaluationLens({
  code,
  result,
}: {
  code: string;
  result: TclRunResult | null;
}) {
  const focusLine =
    code
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#")) ?? "";
  const fragments = focusLine
    .split(/(\[[^\]]+\]|\$[A-Za-z_][\w:]*(?:\([^)]*\))?|\{[^}]*\})/g)
    .filter(Boolean);
  const substitutions = [
    focusLine.match(/\$[A-Za-z_][\w:]*(?:\([^)]*\))?/g)?.length
      ? "变量替换 $"
      : null,
    focusLine.includes("[") ? "命令替换 […]" : null,
    focusLine.includes("\\") ? "反斜杠替换 \\" : null,
    focusLine.includes("{") ? "花括号保护原文" : null,
  ].filter(Boolean);

  return (
    <section className="lens-card" aria-label="Tcl 求值透镜">
      <div className="visual-heading">
        <span>01 / EVALUATION LENS</span>
        <strong>这一行到底怎样被 Tcl 读懂</strong>
      </div>
      <div className="lens-code">
        {fragments.map((fragment, index) => {
          const type = fragment.startsWith("$")
            ? "variable"
            : fragment.startsWith("[")
              ? "command"
              : fragment.startsWith("{")
                ? "literal"
                : "plain";
          return (
            <code className={`lens-${type}`} key={`${fragment}-${index}`}>
              {fragment}
            </code>
          );
        })}
      </div>
      <div className="lens-phases">
        <div>
          <b>1</b>
          <span>分成命令名与参数词</span>
        </div>
        <div>
          <b>2</b>
          <span>{substitutions.join(" · ") || "没有需要执行的替换"}</span>
        </div>
        <div>
          <b>3</b>
          <span>
            {result
              ? result.error
                ? `错误：${result.error}`
                : `结果：${result.result || result.output.at(-1) || "空字符串"}`
              : "替换完成后调用命令"}
          </span>
        </div>
      </div>
    </section>
  );
}

function DesignDatabase({ result }: { result: TclRunResult | null }) {
  const highlighted = new Set(
    result?.trace.flatMap((event) => event.objects) ?? [],
  );
  const flowEvents =
    result?.trace.filter(
      (event) =>
        !event.command.startsWith("get_") &&
        !["filter"].includes(event.command),
    ) ?? [];

  return (
    <section className="design-db" aria-label="EDA 对象数据库">
      <div className="visual-heading">
        <span>02 / DESIGN DATABASE</span>
        <strong>
          {flowEvents.length ? "工具流程轨迹" : "对象查询不是字符串搜索"}
        </strong>
      </div>

      {flowEvents.length ? (
        <div className="flow-track">
          {flowEvents.map((event, index) => (
            <div className="flow-event" key={`${event.command}-${index}`}>
              <i>{String(index + 1).padStart(2, "0")}</i>
              <span>{event.command}</span>
              <small>{event.objects.join(", ")}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="object-grid">
          {Object.entries(designObjects).map(([type, objects]) => (
            <div className="object-column" key={type}>
              <small>{type.toUpperCase()}</small>
              {objects.map((name) => (
                <span
                  className={highlighted.has(name) ? "highlighted" : ""}
                  key={`${type}-${name}`}
                >
                  {name}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="query-trace">
        <span>QUERY TRACE</span>
        {result?.trace.length ? (
          result.trace.map((event, index) => (
            <code key={`${event.command}-${index}`}>
              {event.command} → {event.count}
            </code>
          ))
        ) : (
          <small>运行 get_* / filter / flow 命令后，这里会出现真实调用轨迹。</small>
        )}
      </div>
    </section>
  );
}

function RuntimeBadge({
  status,
  version,
}: {
  status: string;
  version: string;
}) {
  const label =
    status === "ready"
      ? "READY"
      : status === "running"
        ? "RUNNING"
        : status === "failed"
          ? "FAILED"
          : "LOADING";
  return (
    <div className={`runtime-badge runtime-${status}`}>
      <i />
      <span>{version}</span>
      <b>{label}</b>
    </div>
  );
}

export function TclDojo() {
  const { run, status, version, restart } = useTclRuntime();
  const { completed, complete, reset, hydrated } = usePersistentProgress();
  const [activeLessonId, setActiveLessonId] = useState(allLessons[0].id);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [code, setCode] = useState(allLessons[0].challenges[0].starter);
  const [runResult, setRunResult] = useState<TclRunResult | null>(null);
  const [verdict, setVerdict] = useState<"success" | "retry" | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [railOpen, setRailOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [solutionAppliedId, setSolutionAppliedId] = useState<string | null>(
    null,
  );
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const activeLesson = findLesson(activeLessonId);
  const activeChallenge =
    activeLesson.challenges[challengeIndex] ?? activeLesson.challenges[0];
  const activeModule = courseModules.find(
    (module) => module.id === activeLesson.moduleId,
  )!;
  const absolutePosition = challengePosition(activeLesson, challengeIndex);
  const progress = hydrated
    ? Math.round((completed.size / allChallenges.length) * 100)
    : 0;

  const visibleModules = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return courseModules;
    return courseModules
      .map((module) => ({
        ...module,
        lessons: module.lessons.filter((item) =>
          [
            item.title,
            item.eyebrow,
            item.concepts.join(" "),
            item.number,
          ]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        ),
      }))
      .filter((module) => module.lessons.length);
  }, [search]);

  const selectLesson = useCallback((lessonId: string, index = 0) => {
    const nextLesson = findLesson(lessonId);
    const safeIndex = Math.min(index, nextLesson.challenges.length - 1);
    const nextChallenge = nextLesson.challenges[safeIndex];
    let nextCode = nextChallenge.starter;

    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "{}");
      nextCode = drafts[nextChallenge.id] ?? nextChallenge.starter;
      localStorage.setItem(RECENT_KEY, `${lessonId}:${safeIndex}`);
    } catch {
      nextCode = nextChallenge.starter;
    }

    setActiveLessonId(lessonId);
    setChallengeIndex(safeIndex);
    setCode(nextCode);
    setRunResult(null);
    setVerdict(null);
    setSelectedOption(null);
    setSolutionAppliedId(null);
    setRailOpen(false);
    history.replaceState(null, "", `#${lessonId}/${safeIndex + 1}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const hash = window.location.hash.slice(1);
    const [hashLesson, hashChallenge] = hash.split("/");
    const recent = localStorage.getItem(RECENT_KEY);
    const [recentLesson, recentChallenge] = (recent ?? "").split(":");

    if (hashLesson && allLessons.some((item) => item.id === hashLesson)) {
      // URL and localStorage are external navigation state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      selectLesson(hashLesson, Math.max(0, Number(hashChallenge ?? 1) - 1));
    } else if (
      recentLesson &&
      allLessons.some((item) => item.id === recentLesson)
    ) {
      selectLesson(recentLesson, Number(recentChallenge ?? 0));
    }
  }, [hydrated, selectLesson]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      try {
        const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "{}");
        if (code === activeChallenge.starter) {
          delete drafts[activeChallenge.id];
        } else {
          drafts[activeChallenge.id] = code;
        }
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      } catch {
        // Draft persistence is optional; the editor remains fully usable.
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeChallenge.id, activeChallenge.starter, code, hydrated]);

  const runAndCheck = async () => {
    if (status !== "ready") return;
    setVerdict(null);
    setRunResult(null);
    const result = await run(code);
    setRunResult(result);

    if (
      activeChallenge.kind === "predict" &&
      selectedOption === null &&
      !result.error
    ) {
      return;
    }

    const passed =
      activeChallenge.kind === "predict"
        ? selectedOption === activeChallenge.answer
        : validateRun(activeChallenge, result);
    setVerdict(passed ? "success" : "retry");
    if (passed) complete(activeChallenge.id);
  };

  const chooseOption = (index: number) => {
    setSelectedOption(index);
    const passed = index === activeChallenge.answer;
    setVerdict(passed ? "success" : "retry");
    if (passed) complete(activeChallenge.id);
  };

  const nextStep = () => {
    if (challengeIndex < activeLesson.challenges.length - 1) {
      selectLesson(activeLesson.id, challengeIndex + 1);
      return;
    }
    const lessonIndex = allLessons.findIndex(
      (item) => item.id === activeLesson.id,
    );
    if (lessonIndex < allLessons.length - 1) {
      selectLesson(allLessons[lessonIndex + 1].id, 0);
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void runAndCheck();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = `${code.slice(0, start)}    ${code.slice(end)}`;
      setCode(next);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const resetCurrent = () => {
    setCode(activeChallenge.starter);
    setRunResult(null);
    setVerdict(null);
    setSelectedOption(null);
    setSolutionAppliedId(null);
  };

  const applyReferenceSolution = () => {
    if (
      activeChallenge.kind === "predict" &&
      activeChallenge.answer !== undefined
    ) {
      chooseOption(activeChallenge.answer);
      setSolutionAppliedId(activeChallenge.id);
      return;
    }

    const solution = activeChallenge.solution;
    setCode(solution);
    setRunResult(null);
    setVerdict(null);
    setSelectedOption(null);
    setSolutionAppliedId(activeChallenge.id);

    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "{}");
      drafts[activeChallenge.id] = solution;
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch {
      // Immediate persistence is a convenience; the normal draft effect
      // remains the fallback when storage is unavailable.
    }

    requestAnimationFrame(() => {
      const editor = editorRef.current;
      editor?.focus();
      editor?.scrollIntoView({ behavior: "smooth", block: "center" });
      editor?.setSelectionRange(0, 0);
    });
  };

  const lessonCompleted = (lesson: Lesson) =>
    lesson.challenges.every((item) => completed.has(item.id));

  const showEvaluationLens =
    activeModule.id === "evaluation" ||
    ["start", "data-control", "foundation-plus"].includes(activeModule.id);
  const challengeUsesEda =
    activeChallenge.expectation?.traceCommands?.some(
      (command) =>
        command.startsWith("get_") ||
        [
          "read_verilog",
          "read_xdc",
          "synth_design",
          "opt_design",
          "place_design",
          "route_design",
        ].includes(command),
    ) ?? false;
  const showDesignDatabase = [
    "eda-objects",
    "vivado-flow",
    "capstones",
  ].includes(activeModule.id) || challengeUsesEda;
  const atCourseEnd =
    activeLesson.id === allLessons.at(-1)?.id &&
    challengeIndex === activeLesson.challenges.length - 1;

  return (
    <div className="dojo-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => selectLesson(allLessons[0].id)}
          type="button"
        >
          <span className="brand-mark">T</span>
          <span>
            <strong>TCL/DOJO</strong>
            <small>EDA AUTOMATION LAB</small>
          </span>
        </button>

        <div className="topbar-center">
          <span>总进度</span>
          <div className="top-progress">
            <i style={{ width: `${progress}%` }} />
          </div>
          <strong>{progress}%</strong>
          <small>
            {completed.size}/{courseStats.challenges} 任务
          </small>
        </div>

        <div className="topbar-actions">
          <RuntimeBadge status={status} version={version} />
          <button
            className="reference-button"
            onClick={() => setReferenceOpen((open) => !open)}
            type="button"
          >
            命令速查 <span>?</span>
          </button>
          <button
            className="rail-toggle"
            onClick={() => setRailOpen((open) => !open)}
            type="button"
            aria-label="打开课程目录"
          >
            目录
          </button>
        </div>
      </header>

      {referenceOpen && (
        <aside className="reference-drawer">
          <div className="reference-heading">
            <div>
              <span className="mini-label">QUICK REFERENCE</span>
              <h2>够用的 Tcl 命令表</h2>
              <p>先按任务找命令，再去工具 help 核对方言和选项。</p>
            </div>
            <button onClick={() => setReferenceOpen(false)} type="button">
              关闭 ×
            </button>
          </div>
          <div className="reference-grid">
            {commandReference.map(([command, description]) => (
              <div key={command}>
                <code>{command}</code>
                <span>{description}</span>
              </div>
            ))}
          </div>
          <div className="reference-foot">
            <b>运行环境</b>
            <span>{version} WebAssembly · 每次执行隔离 · 2 秒超时</span>
            <button onClick={restart} type="button">
              重启内核
            </button>
          </div>
        </aside>
      )}

      <div className="workspace">
        <aside className={`lesson-rail ${railOpen ? "rail-open" : ""}`}>
          <div className="rail-intro">
            <span className="mini-label">THE ZERO-TO-FLOW PATH</span>
            <h1>别背语法。<br />把流程跑起来。</h1>
            <p>
              {courseStats.modules} 阶段 · {courseStats.lessons} 课 ·{" "}
              {courseStats.challenges} 个动手任务 · 真实 Tcl 8.6 内核
            </p>
          </div>

          <label className="course-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索课程或命令"
              type="search"
            />
          </label>

          <nav className="module-list" aria-label="课程目录">
            {visibleModules.map((module) => {
              const completedLessons = module.lessons.filter(lessonCompleted)
                .length;
              return (
                <section className="module-group" key={module.id}>
                  <div className="module-label">
                    <span>{module.index}</span>
                    <strong>{module.shortTitle}</strong>
                    <i>
                      {completedLessons}/{module.lessons.length}
                    </i>
                  </div>
                  {module.lessons.map((item) => {
                    const active = item.id === activeLesson.id;
                    return (
                      <button
                        className={`lesson-link ${active ? "active" : ""}`}
                        data-lesson-id={item.id}
                        onClick={() => selectLesson(item.id)}
                        key={item.id}
                        type="button"
                      >
                        <span className="lesson-number">
                          {lessonCompleted(item) ? "✓" : item.number}
                        </span>
                        <span>
                          <small>{item.eyebrow}</small>
                          <strong>{item.title}</strong>
                        </span>
                        <i>{item.duration}</i>
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </nav>

          <div className="rail-note">
            <span>WHY THIS EXISTS</span>
            <p>
              语言知识与 EDA 对象模型分层教学；每次只增加一个新难点，然后立刻放进工程场景。
            </p>
          </div>
        </aside>

        <main className="lesson-stage">
          <div className="module-banner">
            <div>
              <span>
                MODULE {activeModule.index} · {activeModule.shortTitle}
              </span>
              <p>{activeModule.description}</p>
            </div>
            <strong>{activeModule.outcome}</strong>
          </div>

          <div className="lesson-heading">
            <div>
              <span className="lesson-kicker">
                LESSON {activeLesson.number} / {activeLesson.duration}
              </span>
              <h2>{activeLesson.title}</h2>
            </div>
            <div className="lesson-count">
              <strong>{String(absolutePosition).padStart(2, "0")}</strong>
              <span>/{courseStats.challenges}</span>
            </div>
          </div>

          <section className="mission-card">
            <span className="mission-index">{activeLesson.number}</span>
            <div>
              <small>本课任务</small>
              <p>{activeLesson.mission}</p>
            </div>
            <div className="concepts">
              {activeLesson.concepts.map((concept) => (
                <code key={concept}>{concept}</code>
              ))}
            </div>
          </section>

          {activeLesson.project && (
            <section className="project-brief">
              <div className="project-brief-title">
                <span>PROJECT BRIEF</span>
                <strong>{activeLesson.project.setting}</strong>
              </div>
              <div>
                <small>给定输入</small>
                <p>{activeLesson.project.input}</p>
              </div>
              <div>
                <small>最终交付</small>
                <p>{activeLesson.project.deliverable}</p>
              </div>
              <div className="acceptance-list">
                <small>验收标准</small>
                <ul>
                  {activeLesson.project.acceptance.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <div className="challenge-stepper">
            {activeLesson.challenges.map((item, index) => (
              <button
                className={[
                  index === challengeIndex ? "active" : "",
                  completed.has(item.id) ? "complete" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-challenge-index={index}
                onClick={() => selectLesson(activeLesson.id, index)}
                key={item.id}
                type="button"
              >
                <span>{completed.has(item.id) ? "✓" : index + 1}</span>
                <small>{kindLabels[item.kind]}</small>
                <strong>{item.title}</strong>
              </button>
            ))}
          </div>

          <section
            className="challenge-brief"
            data-challenge-id={activeChallenge.id}
            data-challenge-kind={activeChallenge.kind}
          >
            <span className={`kind-tag kind-${activeChallenge.kind}`}>
              {kindLabels[activeChallenge.kind]}
            </span>
            <div>
              <h3>{activeChallenge.title}</h3>
              <p>{activeChallenge.prompt}</p>
            </div>
            {completed.has(activeChallenge.id) && (
              <span className="done-stamp">PASSED</span>
            )}
          </section>

          {activeChallenge.kind === "predict" && activeChallenge.options && (
            <div className="prediction-grid">
              {activeChallenge.options.map((option, index) => {
                const chosen = selectedOption === index;
                const correct =
                  selectedOption !== null && index === activeChallenge.answer;
                const wrong =
                  chosen && selectedOption !== activeChallenge.answer;
                return (
                  <button
                    className={[
                      chosen ? "chosen" : "",
                      correct ? "correct" : "",
                      wrong ? "wrong" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => chooseOption(index)}
                    key={option}
                    type="button"
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    <code>{option}</code>
                  </button>
                );
              })}
            </div>
          )}

          <section className="lab-grid">
            <div className="editor-panel">
              <div className="panel-bar">
                <div className="window-dots">
                  <i />
                  <i />
                  <i />
                </div>
                <span>lesson_{activeLesson.number}.tcl</span>
                <small>Ctrl / ⌘ + Enter 运行</small>
              </div>
              <div className="editor-wrap">
                <div className="line-numbers" aria-hidden="true">
                  {Array.from({ length: lineCount(code) }, (_, index) => (
                    <span key={index}>{index + 1}</span>
                  ))}
                </div>
                <textarea
                  aria-label="Tcl 代码编辑器"
                  onChange={(event) => {
                    setCode(event.target.value);
                    setSolutionAppliedId(null);
                  }}
                  onKeyDown={handleEditorKeyDown}
                  ref={editorRef}
                  spellCheck={false}
                  value={code}
                />
              </div>
              <div className="editor-actions">
                <div>
                  <button
                    className="text-button"
                    onClick={resetCurrent}
                    type="button"
                  >
                    ↺ 重置
                  </button>
                  <button
                    className="text-button"
                    onClick={copyCode}
                    type="button"
                  >
                    {copied ? "✓ 已复制" : "复制"}
                  </button>
                </div>
                <button
                  className="run-button"
                  data-testid="run-check"
                  disabled={status !== "ready"}
                  onClick={() => void runAndCheck()}
                  type="button"
                >
                  <span>{status === "running" ? "●" : "▶"}</span>
                  {status === "running"
                    ? "正在执行…"
                    : status === "ready"
                      ? "运行并检查"
                      : "加载 Tcl 内核…"}
                </button>
              </div>
            </div>

            <div className="output-panel">
              <div className="panel-bar terminal-bar">
                <span>TERMINAL / {version.toUpperCase()}</span>
                {runResult && (
                  <small>{runResult.elapsedMs.toFixed(1)} ms</small>
                )}
              </div>
              <div className="terminal" aria-live="polite">
                {!runResult ? (
                  <div className="terminal-empty">
                    <span>▮</span>
                    <p>改代码，然后运行。</p>
                    <small>每次执行都在新的隔离 Tcl interpreter 中</small>
                  </div>
                ) : (
                  <>
                    <div className="terminal-command">
                      $ tclsh lesson_{activeLesson.number}.tcl
                    </div>
                    {runResult.output.map((line, index) => (
                      <pre
                        className="terminal-line"
                        key={`${line}-${index}`}
                      >
                        {line}
                      </pre>
                    ))}
                    {runResult.result && (
                      <pre className="terminal-result">
                        ↳ result: {runResult.result}
                      </pre>
                    )}
                    {runResult.error && (
                      <pre className="terminal-error">
                        ERROR: {runResult.error}
                      </pre>
                    )}
                    {!runResult.output.length &&
                      !runResult.result &&
                      !runResult.error && (
                        <p className="terminal-muted">
                          脚本成功执行，没有标准输出。
                        </p>
                      )}
                  </>
                )}

                {verdict && (
                  <div
                    className={`check-result ${verdict}`}
                    data-testid="check-result"
                  >
                    <span>{verdict === "success" ? "✓" : "↻"}</span>
                    <div>
                      <strong>
                        {verdict === "success"
                          ? "检查通过"
                          : "结果还差一点"}
                      </strong>
                      <p>
                        {verdict === "success"
                          ? activeChallenge.success
                          : activeChallenge.kind === "predict"
                            ? "重新沿着 Tcl 求值顺序走一遍，再选择。"
                            : "脚本已真实执行；对照任务中的精确输出、错误或查询链继续修改。"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="hint-box">
                <span>HINT / 提示</span>
                <p>{activeChallenge.hint}</p>
                <details>
                  <summary>仍然卡住？查看参考实现</summary>
                  <pre>{activeChallenge.solution}</pre>
                  <button
                    aria-live="polite"
                    data-testid="apply-reference"
                    onClick={applyReferenceSolution}
                    type="button"
                  >
                    {solutionAppliedId === activeChallenge.id
                      ? activeChallenge.kind === "predict"
                        ? "✓ 已选择正确答案"
                        : "✓ 已放入编辑器"
                      : activeChallenge.kind === "predict"
                        ? "选择正确答案"
                        : "放入编辑器"}
                  </button>
                </details>
              </div>
            </div>
          </section>

          {(showEvaluationLens || showDesignDatabase) && (
            <div className="visual-lab">
              {showEvaluationLens && (
                <TclEvaluationLens code={code} result={runResult} />
              )}
              {showDesignDatabase && <DesignDatabase result={runResult} />}
            </div>
          )}

          <footer className="lesson-footer">
            <div className="rule-card">
              <span className="mini-label">MENTAL MODEL / 心法</span>
              <p>{activeLesson.rule}</p>
            </div>
            <div className="field-note">
              <span className="mini-label">ON THE JOB / 工程现场</span>
              <p>{activeLesson.fieldNote}</p>
            </div>
            <button
              className="next-button"
              disabled={atCourseEnd}
              onClick={nextStep}
              type="button"
            >
              {atCourseEnd
                ? "全课结束"
                : challengeIndex < activeLesson.challenges.length - 1
                  ? "下一任务"
                  : "下一课"}
              <span>{atCourseEnd ? "✓" : "→"}</span>
            </button>
          </footer>

          <section className="course-integrity">
            <div>
              <span>REAL RUNTIME</span>
              <strong>Tcl 8.6 · Wacl/WASM</strong>
              <p>不是 JavaScript 仿写语法；标准 Tcl 命令由真实解释器执行。</p>
            </div>
            <div>
              <span>SAFE LAB</span>
              <strong>隔离解释器 · 超时重启</strong>
              <p>文件只进入浏览器虚拟系统；死循环会在 2 秒后终止。</p>
            </div>
            <div>
              <span>TOOL DIALECT</span>
              <strong>Vivado 风格教学数据库</strong>
              <p>EDA 命令为稳定模拟；迁移真实工具时请以对应版本 help 为准。</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm("清空全部学习进度和草稿？")) {
                  reset();
                  selectLesson(allLessons[0].id);
                }
              }}
              type="button"
            >
              清空本机进度
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

export default TclDojo;
