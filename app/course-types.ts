export type ChallengeKind =
  | "observe"
  | "predict"
  | "edit"
  | "repair"
  | "create"
  | "capstone";

export type RunExpectation = {
  outputExact?: string[];
  outputIncludes?: string[];
  resultEquals?: string;
  errorIncludes?: string;
  traceCommands?: string[];
};

export type Challenge = {
  id: string;
  kind: ChallengeKind;
  title: string;
  prompt: string;
  starter: string;
  solution: string;
  hint: string;
  success: string;
  explanation?: string;
  options?: string[];
  answer?: number;
  expectation?: RunExpectation;
};

export type ProjectBrief = {
  setting: string;
  input: string;
  deliverable: string;
  acceptance: string[];
};

export type Lesson = {
  id: string;
  number: string;
  moduleId: string;
  eyebrow: string;
  title: string;
  duration: string;
  mission: string;
  rule: string;
  fieldNote: string;
  concepts: string[];
  challenges: Challenge[];
  project?: ProjectBrief;
};

export type CourseModule = {
  id: string;
  index: string;
  title: string;
  shortTitle: string;
  description: string;
  outcome: string;
  lessons: Lesson[];
};

export type RuntimeTrace = {
  command: string;
  count: number;
  objects: string[];
};

export type TclRunResult = {
  output: string[];
  result: string;
  error?: string;
  trace: RuntimeTrace[];
  elapsedMs: number;
};
