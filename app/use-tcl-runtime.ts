"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TclRunResult } from "./course-types";

type RuntimeStatus = "loading" | "ready" | "running" | "restarting" | "failed";

type WorkerResponse =
  | { type: "ready"; version: string }
  | ({ type: "result"; requestId: number } & TclRunResult)
  | { type: "fatal"; error: string };

type PendingRun = {
  resolve: (result: TclRunResult) => void;
  timer: ReturnType<typeof setTimeout>;
  startedAt: number;
};

export function useTclRuntime() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<number, PendingRun>());
  const nextIdRef = useRef(1);
  const [status, setStatus] = useState<RuntimeStatus>("loading");
  const [version, setVersion] = useState("Tcl 8.6");

  const failPending = useCallback((message: string) => {
    for (const pending of pendingRef.current.values()) {
      clearTimeout(pending.timer);
      pending.resolve({
        output: [],
        result: "",
        error: message,
        trace: [],
        elapsedMs: performance.now() - pending.startedAt,
      });
    }
    pendingRef.current.clear();
  }, []);

  const startWorker = useCallback(() => {
    workerRef.current?.terminate();
    setStatus((current) => (current === "loading" ? "loading" : "restarting"));

    const worker = new Worker("/tcl-worker.js");
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      if (message.type === "ready") {
        setVersion(`Tcl ${message.version}`);
        setStatus("ready");
        return;
      }

      if (message.type === "fatal") {
        console.error("Tcl worker fatal:", message.error);
        setStatus("failed");
        failPending(message.error);
        return;
      }

      const pending = pendingRef.current.get(message.requestId);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingRef.current.delete(message.requestId);
      setStatus("ready");
      pending.resolve({
        output: message.output,
        result: message.result,
        error: message.error,
        trace: message.trace,
        elapsedMs: message.elapsedMs,
      });
    };

    worker.onerror = (event) => {
      console.error(
        "Tcl worker error:",
        event.message,
        event.filename,
        event.lineno,
      );
      setStatus("failed");
      failPending("Tcl 运行内核意外退出，请稍后重试。");
    };
  }, [failPending]);

  useEffect(() => {
    // Starting the Worker synchronizes React with the external Tcl runtime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startWorker();
    return () => {
      workerRef.current?.terminate();
      failPending("页面已离开，执行已取消。");
    };
  }, [failPending, startWorker]);

  const run = useCallback(
    (code: string) =>
      new Promise<TclRunResult>((resolve) => {
        const worker = workerRef.current;
        if (!worker || (status !== "ready" && status !== "running")) {
          resolve({
            output: [],
            result: "",
            error:
              status === "failed"
                ? "运行内核加载失败，请刷新页面重试。"
                : "Tcl 运行内核仍在加载，请稍等一秒。",
            trace: [],
            elapsedMs: 0,
          });
          return;
        }

        const requestId = nextIdRef.current++;
        const startedAt = performance.now();
        setStatus("running");

        const timer = setTimeout(() => {
          pendingRef.current.delete(requestId);
          resolve({
            output: [],
            result: "",
            error: "执行超过 2 秒，已自动终止并重启运行内核。",
            trace: [],
            elapsedMs: performance.now() - startedAt,
          });
          startWorker();
        }, 2000);

        pendingRef.current.set(requestId, { resolve, timer, startedAt });
        worker.postMessage({ type: "run", requestId, code });
      }),
    [startWorker, status],
  );

  return { run, status, version, restart: startWorker };
}
