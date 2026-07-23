"use client";

import { useEffect, useMemo, useState } from "react";

type TclObject = {
  __tclObject: true;
  type: "cell" | "port" | "clock" | "path";
  properties: Record<string, TclValue>;
};

type TclValue = string | number | boolean | TclObject | TclValue[];
type Word = { kind: "brace" | "quote" | "bare"; raw: string };
type Procedure = { args: string[]; body: string };
type RunResult = { output: string[]; error?: string };

const cells: TclObject[] = [
  object("cell", {
    NAME: "u_cpu/state_reg",
    REF_NAME: "FDRE",
    IS_SEQUENTIAL: true,
  }),
  object("cell", {
    NAME: "u_dma/count_reg",
    REF_NAME: "FDRE",
    IS_SEQUENTIAL: true,
  }),
  object("cell", {
    NAME: "u_uart/rx_reg",
    REF_NAME: "FDCE",
    IS_SEQUENTIAL: true,
  }),
  object("cell", {
    NAME: "u_mem/valid_reg",
    REF_NAME: "FDRE",
    IS_SEQUENTIAL: true,
  }),
  object("cell", {
    NAME: "u_cpu/data_lut",
    REF_NAME: "LUT6",
    IS_SEQUENTIAL: false,
  }),
];

const ports: TclObject[] = [
  object("port", {
    NAME: "out_data",
    DIRECTION: "OUT",
    HAS_OUTPUT_DELAY: true,
  }),
  object("port", {
    NAME: "out_valid",
    DIRECTION: "OUT",
    HAS_OUTPUT_DELAY: false,
  }),
  object("port", {
    NAME: "irq",
    DIRECTION: "OUT",
    HAS_OUTPUT_DELAY: false,
  }),
  object("port", {
    NAME: "debug_bus",
    DIRECTION: "OUT",
    HAS_OUTPUT_DELAY: true,
  }),
  object("port", {
    NAME: "sys_clk",
    DIRECTION: "IN",
    HAS_OUTPUT_DELAY: false,
  }),
];

const clocks: TclObject[] = [
  object("clock", { NAME: "sys_clk", PERIOD: 10 }),
  object("clock", { NAME: "pixel_clk", PERIOD: 6.734 }),
];

const timingPaths: TclObject[] = [
  object("path", {
    STARTPOINT_PIN: "cpu/reg_a",
    ENDPOINT_PIN: "mem/reg_b",
    SLACK: -0.23,
  }),
  object("path", {
    STARTPOINT_PIN: "dma/reg_c",
    ENDPOINT_PIN: "cpu/reg_d",
    SLACK: 0.15,
  }),
  object("path", {
    STARTPOINT_PIN: "uart/reg_e",
    ENDPOINT_PIN: "cpu/reg_f",
    SLACK: -0.05,
  }),
];

function object(
  type: TclObject["type"],
  properties: Record<string, TclValue>,
): TclObject {
  return { __tclObject: true, type, properties };
}

function splitCommands(script: string) {
  const commands: string[] = [];
  let current = "";
  let braceDepth = 0;
  let bracketDepth = 0;
  let quoted = false;
  let escaped = false;

  for (const char of script.replace(/\r\n/g, "\n")) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }
    if (char === '"' && braceDepth === 0) quoted = !quoted;
    if (!quoted) {
      if (char === "{") braceDepth += 1;
      if (char === "}") braceDepth -= 1;
      if (char === "[") bracketDepth += 1;
      if (char === "]") bracketDepth -= 1;
    }
    if (
      (char === "\n" || char === ";") &&
      braceDepth === 0 &&
      bracketDepth === 0 &&
      !quoted
    ) {
      if (current.trim()) commands.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) commands.push(current.trim());
  return commands.filter((command) => !command.trimStart().startsWith("#"));
}

function tokenize(command: string): Word[] {
  const words: Word[] = [];
  let index = 0;

  while (index < command.length) {
    while (/\s/.test(command[index] ?? "")) index += 1;
    if (index >= command.length) break;

    if (command[index] === "{") {
      let depth = 1;
      let value = "";
      index += 1;
      while (index < command.length && depth > 0) {
        const char = command[index];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        if (depth > 0) value += char;
        index += 1;
      }
      if (depth !== 0) throw new Error("缺少右花括号 }");
      words.push({ kind: "brace", raw: value });
      continue;
    }

    if (command[index] === '"') {
      let value = "";
      let escaped = false;
      index += 1;
      while (index < command.length) {
        const char = command[index];
        if (!escaped && char === '"') {
          index += 1;
          break;
        }
        value += char;
        escaped = !escaped && char === "\\";
        if (char !== "\\") escaped = false;
        index += 1;
      }
      words.push({ kind: "quote", raw: value });
      continue;
    }

    let value = "";
    let bracketDepth = 0;
    while (index < command.length) {
      const char = command[index];
      if (char === "[") bracketDepth += 1;
      if (char === "]") bracketDepth -= 1;
      if (/\s/.test(char) && bracketDepth === 0) break;
      value += char;
      index += 1;
    }
    words.push({ kind: "bare", raw: value });
  }

  return words;
}

function parseList(value: TclValue): TclValue[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [value];
  const items: TclValue[] = [];
  let index = 0;

  while (index < value.length) {
    while (/\s/.test(value[index] ?? "")) index += 1;
    if (index >= value.length) break;

    if (value[index] === "{") {
      let depth = 1;
      let item = "";
      index += 1;
      while (index < value.length && depth > 0) {
        const char = value[index];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        if (depth > 0) item += char;
        index += 1;
      }
      items.push(item.trim());
      continue;
    }

    if (value[index] === '"') {
      let item = "";
      index += 1;
      while (index < value.length && value[index] !== '"') {
        item += value[index];
        index += 1;
      }
      index += 1;
      items.push(item);
      continue;
    }

    let item = "";
    while (index < value.length && !/\s/.test(value[index])) {
      item += value[index];
      index += 1;
    }
    items.push(item);
  }
  return items;
}

function valueToString(value: TclValue | undefined): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.map(valueToString).join(" ");
  if (typeof value === "object")
    return valueToString(value.properties.NAME ?? value.type);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function globMatch(value: string, pattern: string) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i").test(value);
}

function filterObjects(items: TclObject[], filter: string) {
  const match = filter.match(
    /^\s*([A-Za-z_][\w]*)\s*(==|!=|=~|!~)\s*(.*?)\s*$/,
  );
  if (!match) return items;
  const [, property, operator, rawExpected] = match;
  const expected = rawExpected.replace(/^["']|["']$/g, "");

  return items.filter((item) => {
    const actual = valueToString(item.properties[property]);
    if (operator === "=~") return globMatch(actual, expected);
    if (operator === "!~") return !globMatch(actual, expected);
    if (operator === "==")
      return actual.toLowerCase() === expected.toLowerCase();
    return actual.toLowerCase() !== expected.toLowerCase();
  });
}

class ReturnSignal {
  constructor(public value: TclValue) {}
}

export class MiniTcl {
  output: string[] = [];
  procedures = new Map<string, Procedure>();

  run(script: string): RunResult {
    try {
      this.executeScript(script, new Map());
      return { output: this.output };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "脚本执行过程中出现未知错误";
      return { output: this.output, error: message };
    }
  }

  executeScript(script: string, scope: Map<string, TclValue>): TclValue {
    let result: TclValue = "";
    for (const command of splitCommands(script)) {
      result = this.executeCommand(tokenize(command), scope);
    }
    return result;
  }

  executeCommand(words: Word[], scope: Map<string, TclValue>): TclValue {
    if (words.length === 0) return "";
    const command = valueToString(this.resolveWord(words[0], scope));

    if (command === "set") {
      const name = words[1]?.raw;
      if (!name) throw new Error("set 缺少变量名");
      if (words.length === 2) return scope.get(name) ?? "";
      const value = this.resolveWord(words[2], scope);
      scope.set(name, value);
      return value;
    }

    if (command === "puts") {
      const value = this.resolveWord(words.at(-1)!, scope);
      this.output.push(valueToString(value));
      return "";
    }

    if (command === "incr") {
      const name = words[1]?.raw;
      const amount = words[2]
        ? Number(this.resolveWord(words[2], scope))
        : 1;
      const next = Number(scope.get(name) ?? 0) + amount;
      scope.set(name, next);
      return next;
    }

    if (command === "lassign") {
      const values = parseList(this.resolveWord(words[1], scope));
      words.slice(2).forEach((word, index) => {
        scope.set(word.raw, values[index] ?? "");
      });
      return "";
    }

    if (command === "foreach") {
      const variable = words[1]?.raw;
      const values = parseList(this.resolveWord(words[2], scope));
      const body = words[3]?.raw ?? "";
      let result: TclValue = "";
      for (const value of values) {
        scope.set(variable, value);
        result = this.executeScript(body, scope);
      }
      return result;
    }

    if (command === "if") {
      const condition = this.evaluateExpression(words[1]?.raw ?? "", scope);
      if (condition) {
        return this.executeScript(words[2]?.raw ?? "", scope);
      }
      const elseIndex = words.findIndex(
        (word, index) => index > 2 && word.raw === "else",
      );
      if (elseIndex >= 0)
        return this.executeScript(words[elseIndex + 1]?.raw ?? "", scope);
      return "";
    }

    if (command === "proc") {
      const name = words[1]?.raw;
      const args = parseList(words[2]?.raw ?? "").map(valueToString);
      const body = words[3]?.raw ?? "";
      this.procedures.set(name, { args, body });
      return "";
    }

    if (command === "return") {
      throw new ReturnSignal(
        words[1] ? this.resolveWord(words[1], scope) : "",
      );
    }

    if (command === "error") {
      throw new Error(valueToString(this.resolveWord(words[1], scope)));
    }

    if (command === "llength") {
      return parseList(this.resolveWord(words[1], scope)).length;
    }

    if (command === "lindex") {
      const list = parseList(this.resolveWord(words[1], scope));
      const index = Number(this.resolveWord(words[2], scope));
      return list[index] ?? "";
    }

    if (command === "list") {
      return words.slice(1).map((word) => this.resolveWord(word, scope));
    }

    if (command === "expr") {
      return this.evaluateExpression(words[1]?.raw ?? "", scope);
    }

    if (command === "get_cells") {
      const filter = this.optionValue(words, "-filter", scope);
      return filter ? filterObjects(cells, valueToString(filter)) : cells;
    }

    if (command === "get_ports") {
      const filter = this.optionValue(words, "-filter", scope);
      return filter ? filterObjects(ports, valueToString(filter)) : ports;
    }

    if (command === "get_clocks") return clocks;

    if (command === "get_timing_paths") {
      const threshold = this.optionValue(
        words,
        "-slack_lesser_than",
        scope,
      );
      if (threshold === undefined) return timingPaths;
      return timingPaths.filter(
        (path) =>
          Number(path.properties.SLACK) < Number(valueToString(threshold)),
      );
    }

    if (command === "get_property") {
      const property = valueToString(this.resolveWord(words[1], scope));
      const target = this.resolveWord(words[2], scope);
      if (
        !target ||
        typeof target !== "object" ||
        Array.isArray(target) ||
        !target.__tclObject
      ) {
        throw new Error(`get_property 找不到有效对象：${valueToString(target)}`);
      }
      return target.properties[property] ?? "";
    }

    const procedure = this.procedures.get(command);
    if (procedure) {
      const localScope = new Map<string, TclValue>();
      const args = words
        .slice(1)
        .map((word) => this.resolveWord(word, scope));
      procedure.args.forEach((name, index) => {
        localScope.set(name, args[index] ?? "");
      });
      try {
        return this.executeScript(procedure.body, localScope);
      } catch (error) {
        if (error instanceof ReturnSignal) return error.value;
        throw error;
      }
    }

    throw new Error(`暂不支持命令 “${command}”`);
  }

  optionValue(
    words: Word[],
    option: string,
    scope: Map<string, TclValue>,
  ) {
    const index = words.findIndex((word) => word.raw === option);
    if (index < 0 || !words[index + 1]) return undefined;
    return this.resolveWord(words[index + 1], scope);
  }

  resolveWord(word: Word, scope: Map<string, TclValue>): TclValue {
    if (!word) return "";
    if (word.kind === "brace") return word.raw;

    const exactVariable = word.raw.match(
      /^\$([A-Za-z_][\w]*(?:::[A-Za-z_][\w]*)*)$/,
    );
    if (exactVariable) return scope.get(exactVariable[1]) ?? "";

    if (word.raw.startsWith("[") && word.raw.endsWith("]")) {
      const inner = word.raw.slice(1, -1);
      if (this.isBalanced(inner)) return this.executeScript(inner, scope);
    }

    let value = "";
    for (let index = 0; index < word.raw.length; index += 1) {
      const char = word.raw[index];
      if (char === "[") {
        let depth = 1;
        let inner = "";
        index += 1;
        while (index < word.raw.length && depth > 0) {
          const next = word.raw[index];
          if (next === "[") depth += 1;
          if (next === "]") depth -= 1;
          if (depth > 0) inner += next;
          index += 1;
        }
        value += valueToString(this.executeScript(inner, scope));
        index -= 1;
        continue;
      }
      if (char === "$") {
        const rest = word.raw.slice(index + 1);
        const match = rest.match(
          /^([A-Za-z_][\w]*(?:::[A-Za-z_][\w]*)*)/,
        );
        if (match) {
          value += valueToString(scope.get(match[1]));
          index += match[1].length;
          continue;
        }
      }
      if (char === "\\" && word.raw[index + 1]) {
        const escaped = word.raw[index + 1];
        value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped;
        index += 1;
        continue;
      }
      value += char;
    }
    return value;
  }

  isBalanced(value: string) {
    let depth = 0;
    for (const char of value) {
      if (char === "[") depth += 1;
      if (char === "]") depth -= 1;
    }
    return depth === 0;
  }

  evaluateExpression(expression: string, scope: Map<string, TclValue>) {
    const substituted = valueToString(
      this.resolveWord({ kind: "quote", raw: expression }, scope),
    ).trim();
    const match = substituted.match(/^(.*?)\s*(==|!=|<=|>=|<|>)\s*(.*?)$/);
    if (!match) return this.atom(substituted);
    const left = this.atom(match[1]);
    const right = this.atom(match[3]);
    switch (match[2]) {
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case "<=":
        return Number(left) <= Number(right);
      case ">=":
        return Number(left) >= Number(right);
      case "<":
        return Number(left) < Number(right);
      case ">":
        return Number(left) > Number(right);
      default:
        return false;
    }
  }

  atom(value: string): string | number | boolean {
    const clean = value.trim().replace(/^["']|["']$/g, "");
    if (clean === "true") return true;
    if (clean === "false") return false;
    if (clean !== "" && !Number.isNaN(Number(clean))) return Number(clean);
    return clean;
  }
}

type Lesson = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  duration: string;
  mission: string;
  rule: string;
  starter: string;
  solution: string;
  hint: string;
  success: string;
  realWorld: string;
  concepts: string[];
  validate: (result: RunResult) => boolean;
};

export const lessons: Lesson[] = [
  {
    id: "variables",
    number: "01",
    eyebrow: "参数化一次构建",
    title: "变量不是知识点，是旋钮",
    duration: "3 min",
    mission: "把目标频率从 150 MHz 改成 200 MHz，然后运行脚本。",
    rule: "set 保存值，$ 取出值。先把会变化的东西变成变量。",
    starter: `# 任务：把目标频率改成 200 MHz
set frequency 150

puts "Target frequency: $frequency MHz"`,
    solution: `# 任务：把目标频率改成 200 MHz
set frequency 200

puts "Target frequency: $frequency MHz"`,
    hint: "只需要改 set frequency 后面的数字。",
    success: "参数修改成功。你已经会读最常见的两条 Tcl 命令。",
    realWorld:
      "真实工程里，器件型号、顶层模块、时钟周期和输出目录都适合先变成变量。",
    concepts: ["set", "$变量", "puts"],
    validate: ({ output, error }) =>
      !error && output.includes("Target frequency: 200 MHz"),
  },
  {
    id: "lists",
    number: "02",
    eyebrow: "批量处理时序路径",
    title: "列表 + 循环，告别复制粘贴",
    duration: "5 min",
    mission: "当前只打印第一条路径。修改 foreach，让它遍历全部三条路径。",
    rule: "foreach 依次取出列表元素；lassign 把一条记录拆成多个变量。",
    starter: `set paths {
    {cpu/reg_a  mem/reg_b  -0.23}
    {dma/reg_c  cpu/reg_d   0.15}
    {uart/reg_e cpu/reg_f  -0.05}
}

# TODO：把下面的列表改成 $paths
foreach path [list [lindex $paths 0]] {
    lassign $path from to slack
    puts "$from -> $to : $slack ns"
}`,
    solution: `set paths {
    {cpu/reg_a  mem/reg_b  -0.23}
    {dma/reg_c  cpu/reg_d   0.15}
    {uart/reg_e cpu/reg_f  -0.05}
}

foreach path $paths {
    lassign $path from to slack
    puts "$from -> $to : $slack ns"
}`,
    hint: "foreach 的结构是：foreach 临时变量 列表 {要重复的命令}。",
    success: "三条路径全部输出。批处理就是 Tcl 在 EDA 里的第一生产力。",
    realWorld:
      "工具返回的 cells、pins、ports 和 timing paths，本质上都需要被批量遍历。",
    concepts: ["列表", "foreach", "lassign"],
    validate: ({ output, error }) =>
      !error &&
      output.length === 3 &&
      output.some((line) => line.includes("dma/reg_c")) &&
      output.some((line) => line.includes("uart/reg_e")),
  },
  {
    id: "conditions",
    number: "03",
    eyebrow: "筛出严重违例",
    title: "让脚本替你做判断",
    duration: "5 min",
    mission: "只把 slack 小于 -0.10 ns 的路径算作严重违例。",
    rule: "if 的条件放进花括号；incr 用来给计数器加一。",
    starter: `set paths {
    {cpu/reg_a  mem/reg_b  -0.23}
    {dma/reg_c  cpu/reg_d   0.15}
    {uart/reg_e cpu/reg_f  -0.05}
}

set threshold 0
set violations 0

foreach path $paths {
    lassign $path from to slack
    if {$slack < $threshold} {
        incr violations
        puts "$from -> $to : $slack ns"
    }
}

puts "serious violations=$violations"`,
    solution: `set paths {
    {cpu/reg_a  mem/reg_b  -0.23}
    {dma/reg_c  cpu/reg_d   0.15}
    {uart/reg_e cpu/reg_f  -0.05}
}

set threshold -0.10
set violations 0

foreach path $paths {
    lassign $path from to slack
    if {$slack < $threshold} {
        incr violations
        puts "$from -> $to : $slack ns"
    }
}

puts "serious violations=$violations"`,
    hint: "逻辑已经写好了，只需要把 threshold 从 0 改成 -0.10。",
    success: "只留下最差路径。现在脚本开始表达你的工程判断。",
    realWorld:
      "阈值可以用于 slack、扇出、逻辑级数、利用率等任何需要自动筛选的指标。",
    concepts: ["if", "比较表达式", "incr"],
    validate: ({ output, error }) =>
      !error &&
      output.length === 2 &&
      output[0]?.includes("cpu/reg_a") &&
      output[1] === "serious violations=1",
  },
  {
    id: "queries",
    number: "04",
    eyebrow: "进入设计数据库",
    title: "真正值钱的是 get_* 查询",
    duration: "6 min",
    mission: "当前选中了组合逻辑。把过滤条件改为选中全部时序单元。",
    rule: "[命令] 会先执行内部命令，再把结果放回当前位置。",
    starter: `# 模拟 Vivado 设计数据库
set regs [get_cells -hierarchical -filter {IS_SEQUENTIAL == false}]

puts "found [llength $regs] sequential cells"

foreach reg $regs {
    puts "[get_property NAME $reg]"
}`,
    solution: `# 模拟 Vivado 设计数据库
set regs [get_cells -hierarchical -filter {IS_SEQUENTIAL == true}]

puts "found [llength $regs] sequential cells"

foreach reg $regs {
    puts "[get_property NAME $reg]"
}`,
    hint: "IS_SEQUENTIAL 属性为 true 的 cell 才是寄存器等时序单元。",
    success: "查到 4 个时序单元。你已经从“写脚本”进入“查询设计”。",
    realWorld:
      "把同样的写法放进 Vivado Tcl Console，就会查询当前打开设计的真实对象。",
    concepts: ["[命令替换]", "get_cells", "-filter", "get_property"],
    validate: ({ output, error }) =>
      !error &&
      output[0] === "found 4 sequential cells" &&
      output.length === 5 &&
      output.includes("u_uart/rx_reg"),
  },
  {
    id: "guards",
    number: "05",
    eyebrow: "阻止静默失败",
    title: "查询为空，就让流程停下来",
    duration: "6 min",
    mission: "当前查询匹配不到对象。修正 filter，让保护函数检查到 4 个寄存器。",
    rule: "proc 把经验封装成命令；error 让错误结果无法悄悄混过去。",
    starter: `proc require_objects {label objects} {
    if {[llength $objects] == 0} {
        error "$label matched nothing"
    }
    puts "$label: [llength $objects] objects"
}

# TODO：修正这个明显错误的查询
set regs [get_cells -filter {NAME =~ *ghost*}]
require_objects registers $regs`,
    solution: `proc require_objects {label objects} {
    if {[llength $objects] == 0} {
        error "$label matched nothing"
    }
    puts "$label: [llength $objects] objects"
}

set regs [get_cells -filter {NAME =~ *reg*}]
require_objects registers $regs`,
    hint: "把 *ghost* 换成能匹配寄存器名称的通配形式：*reg*。",
    success: "保护检查通过。比“脚本跑完”更重要的是“脚本没选错对象”。",
    realWorld:
      "高质量 EDA 脚本会对关键查询执行 llength 检查，避免空集合导致虚假成功。",
    concepts: ["proc", "llength", "error", "通配符"],
    validate: ({ output, error }) =>
      !error && output.includes("registers: 4 objects"),
  },
  {
    id: "audit",
    number: "06",
    eyebrow: "最终任务 · 约束体检",
    title: "把工程经验变成自动检查",
    duration: "8 min",
    mission: "脚本现在打印的是已约束端口。修改 if，让它报告缺少 output delay 的端口。",
    rule: "查询对象 → 读取属性 → 判断 → 汇总，这就是大量 EDA 自动化的共同骨架。",
    starter: `set outputs [get_ports -filter {DIRECTION == OUT}]
set missing 0

foreach port $outputs {
    set has_delay [get_property HAS_OUTPUT_DELAY $port]

    # TODO：这里应该检查 false
    if {$has_delay == true} {
        incr missing
        puts "MISSING: [get_property NAME $port]"
    }
}

puts "missing constraints=$missing"`,
    solution: `set outputs [get_ports -filter {DIRECTION == OUT}]
set missing 0

foreach port $outputs {
    set has_delay [get_property HAS_OUTPUT_DELAY $port]

    if {$has_delay == false} {
        incr missing
        puts "MISSING: [get_property NAME $port]"
    }
}

puts "missing constraints=$missing"`,
    hint: "把 if 中的 true 改成 false。缺少约束时 HAS_OUTPUT_DELAY 为 false。",
    success: "约束体检完成。你已经跑通了最实用的 Tcl 思维闭环。",
    realWorld:
      "继续替换属性和对象类型，就能扩展成未约束时钟、异常高扇出、CDC 或时序违例检查。",
    concepts: ["get_ports", "属性检查", "自动审计"],
    validate: ({ output, error }) =>
      !error &&
      output.includes("MISSING: out_valid") &&
      output.includes("MISSING: irq") &&
      output.at(-1) === "missing constraints=2",
  },
];

const reference = [
  ["set name value", "保存变量"],
  ["$name", "读取变量"],
  ["[command]", "执行命令并取返回值"],
  ["{ ... }", "延迟替换 / 包住代码块"],
  ["foreach x $xs { ... }", "遍历集合"],
  ["get_* -filter { ... }", "查询 EDA 对象"],
  ["get_property P $obj", "读取对象属性"],
];

function loadCompleted() {
  if (typeof window === "undefined") return [] as string[];
  try {
    return JSON.parse(localStorage.getItem("tcl-dojo-progress") ?? "[]");
  } catch {
    return [];
  }
}

export function TclDojo() {
  const [activeId, setActiveId] = useState(lessons[0].id);
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeId);
  const lesson = lessons[activeIndex];
  const [codeByLesson, setCodeByLesson] = useState<Record<string, string>>(() =>
    Object.fromEntries(lessons.map((item) => [item.id, item.starter])),
  );
  const [completed, setCompleted] = useState<string[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [passed, setPassed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showReference, setShowReference] = useState(false);

  useEffect(() => {
    setCompleted(loadCompleted());
  }, []);

  const currentCode = codeByLesson[lesson.id];
  const lineCount = useMemo(
    () => currentCode.split("\n").length,
    [currentCode],
  );
  const progress = Math.round((completed.length / lessons.length) * 100);

  function selectLesson(id: string) {
    setActiveId(id);
    setResult(null);
    setPassed(false);
    setShowHint(false);
  }

  function runCode() {
    const nextResult = new MiniTcl().run(currentCode);
    const didPass = lesson.validate(nextResult);
    setResult(nextResult);
    setPassed(didPass);
    if (didPass && !completed.includes(lesson.id)) {
      const nextCompleted = [...completed, lesson.id];
      setCompleted(nextCompleted);
      localStorage.setItem(
        "tcl-dojo-progress",
        JSON.stringify(nextCompleted),
      );
    }
  }

  function updateCode(value: string) {
    setCodeByLesson((current) => ({ ...current, [lesson.id]: value }));
    setResult(null);
    setPassed(false);
  }

  function resetCode() {
    updateCode(lesson.starter);
    setShowHint(false);
  }

  function nextLesson() {
    if (activeIndex < lessons.length - 1)
      selectLesson(lessons[activeIndex + 1].id);
  }

  return (
    <main className="dojo-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => selectLesson(lessons[0].id)}
          aria-label="返回第一关"
        >
          <span className="brand-mark">T</span>
          <span>
            <strong>TCL/DOJO</strong>
            <small>EDA 实战速成</small>
          </span>
        </button>
        <div className="topbar-center">
          <span>路线：从脚本到设计数据库</span>
          <div className="top-progress" aria-label={`课程进度 ${progress}%`}>
            <i style={{ width: `${progress}%` }} />
          </div>
          <strong>{progress}%</strong>
        </div>
        <button
          className="reference-button"
          onClick={() => setShowReference((value) => !value)}
          aria-expanded={showReference}
        >
          {showReference ? "关闭速查" : "语法速查"}
          <span>⌘</span>
        </button>
      </header>

      {showReference && (
        <aside className="reference-drawer" aria-label="Tcl 语法速查">
          <div className="reference-heading">
            <div>
              <span className="mini-label">随用随查</span>
              <h2>七条就够开工</h2>
            </div>
            <button onClick={() => setShowReference(false)}>关闭</button>
          </div>
          <div className="reference-grid">
            {reference.map(([syntax, meaning]) => (
              <div key={syntax}>
                <code>{syntax}</code>
                <span>{meaning}</span>
              </div>
            ))}
          </div>
        </aside>
      )}

      <div className="workspace">
        <nav className="lesson-rail" aria-label="课程关卡">
          <div className="rail-intro">
            <span className="mini-label">30 分钟路线</span>
            <h1>别背语法。<br />解决问题。</h1>
            <p>每关只引入完成当前工程任务所需的一点 Tcl。</p>
          </div>
          <div className="lesson-list">
            {lessons.map((item) => {
              const isActive = item.id === lesson.id;
              const isDone = completed.includes(item.id);
              return (
                <button
                  key={item.id}
                  className={`lesson-link ${isActive ? "active" : ""}`}
                  onClick={() => selectLesson(item.id)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="lesson-number">
                    {isDone ? "✓" : item.number}
                  </span>
                  <span>
                    <small>{item.eyebrow}</small>
                    <strong>{item.title}</strong>
                  </span>
                  <i>{item.duration}</i>
                </button>
              );
            })}
          </div>
          <div className="rail-note">
            <span>LOCAL RUNTIME</span>
            <p>代码只在浏览器内运行。本课程实现了所需 Tcl 子集与模拟 EDA 数据库。</p>
          </div>
        </nav>

        <section className="lesson-stage">
          <div className="lesson-heading">
            <div>
              <span className="lesson-kicker">
                LEVEL {lesson.number} · {lesson.eyebrow}
              </span>
              <h2>{lesson.title}</h2>
            </div>
            <div className="lesson-count">
              <strong>{activeIndex + 1}</strong>
              <span>/ {lessons.length}</span>
            </div>
          </div>

          <div className="mission-card">
            <div className="mission-index">任务</div>
            <p>{lesson.mission}</p>
            <div className="concepts">
              {lesson.concepts.map((concept) => (
                <code key={concept}>{concept}</code>
              ))}
            </div>
          </div>

          <div className="lab-grid">
            <div className="editor-panel">
              <div className="panel-bar">
                <div className="window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <span>lesson_{lesson.number}.tcl</span>
                <small>Ctrl / ⌘ + Enter 运行</small>
              </div>
              <div className="editor-wrap">
                <div className="line-numbers" aria-hidden="true">
                  {Array.from({ length: lineCount }, (_, index) => (
                    <span key={index}>{index + 1}</span>
                  ))}
                </div>
                <textarea
                  value={currentCode}
                  onChange={(event) => updateCode(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                      event.preventDefault();
                      runCode();
                    }
                  }}
                  spellCheck={false}
                  aria-label={`第 ${lesson.number} 关 Tcl 代码编辑器`}
                />
              </div>
              <div className="editor-actions">
                <div>
                  <button className="text-button" onClick={resetCode}>
                    重置
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setShowHint((value) => !value)}
                  >
                    {showHint ? "收起提示" : "给点提示"}
                  </button>
                </div>
                <button className="run-button" onClick={runCode}>
                  <span>▶</span> 运行并检查
                </button>
              </div>
            </div>

            <div className="output-panel">
              <div className="panel-bar terminal-bar">
                <span>OUTPUT</span>
                <small>{result ? "执行完毕" : "等待运行"}</small>
              </div>
              <div className="terminal" aria-live="polite">
                {!result && (
                  <div className="terminal-empty">
                    <span>_</span>
                    <p>修改代码，然后运行。</p>
                    <small>输出与检查结果会出现在这里。</small>
                  </div>
                )}
                {result && (
                  <>
                    <div className="terminal-command">$ tclsh lesson_{lesson.number}.tcl</div>
                    {result.output.map((line, index) => (
                      <div className="terminal-line" key={`${line}-${index}`}>
                        {line}
                      </div>
                    ))}
                    {result.error && (
                      <div className="terminal-error">ERROR: {result.error}</div>
                    )}
                    <div
                      className={`check-result ${passed ? "passed" : "retry"}`}
                    >
                      <span>{passed ? "✓" : "↻"}</span>
                      <div>
                        <strong>{passed ? "检查通过" : "还差一点"}</strong>
                        <p>
                          {passed
                            ? lesson.success
                            : result.error
                              ? "先读错误信息，再试着修正对应命令。"
                              : "输出还没有满足任务要求，可以查看提示。"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {showHint && (
                <div className="hint-box">
                  <span>HINT</span>
                  <p>{lesson.hint}</p>
                  <details>
                    <summary>直接看参考答案</summary>
                    <button onClick={() => updateCode(lesson.solution)}>
                      把答案放进编辑器
                    </button>
                  </details>
                </div>
              )}
            </div>
          </div>

          <div className="lesson-footer">
            <div className="rule-card">
              <span className="mini-label">这一关只记一句</span>
              <p>{lesson.rule}</p>
            </div>
            <div className="field-note">
              <span className="mini-label">放回真实工程</span>
              <p>{lesson.realWorld}</p>
            </div>
            <button
              className="next-button"
              onClick={nextLesson}
              disabled={activeIndex === lessons.length - 1}
            >
              {activeIndex === lessons.length - 1
                ? completed.length === lessons.length
                  ? "训练完成 ✓"
                  : "完成本关即可毕业"
                : "下一关"}
              {activeIndex < lessons.length - 1 && <span>→</span>}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
