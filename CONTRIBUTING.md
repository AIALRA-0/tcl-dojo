# Contributing

感谢你帮助 TCL/DOJO 变得更准确、更好学。

## 课程设计原则

新增内容应遵循这些约束：

1. 一课只引入一个主要语言难点或一个主要 EDA 概念，不同时引入两者。
2. 优先使用“观察 → 预测 → 修改 → 修错 → 独立完成”的任务序列。
3. 任务必须说明工程场景，而不是只问孤立语法。
4. EDA 教学命令要明确标注为模拟；不要暗示完全兼容真实工具版本。
5. 参考答案必须能在浏览器 Tcl 8.6 内核中执行，并通过声明式 expectation。

## 新增题目

题目位于 `app/course-data.ts`。每个 challenge 至少需要：

- 全局唯一 `id`
- `starter` 与 `solution`
- 不直接泄露答案的 `hint`
- 明确的 `success`
- 代码题的 `expectation`，或预测题的 `options` + `answer`

支持的代码判题条件：

- `outputExact`
- `outputIncludes`
- `resultEquals`
- `errorIncludes`
- `traceCommands`

## 修改 EDA 模拟层

EDA 数据库和流程命令定义在 `public/tcl-worker.js` 的 Tcl prelude 中。修改时请：

- 保持对象句柄与 NAME 属性分离；
- 让 `get_*` 查询记录 trace；
- 为新的关系查询补充对象数据库可视化；
- 避免用 JavaScript 直接实现本可由 Tcl 表达的教学逻辑；
- 验证错误状态，不要让错误顺序的 flow 静默通过。

## 提交前检查

```bash
npm run build
npm test
npm run lint
```

此外请至少在现代 Chromium 中完成：

- Tcl runtime 进入 READY；
- 一个基础题通过；
- 一个错误题能显示原生 Tcl error；
- 一个 EDA 题出现 query trace；
- `while {1} {}` 在 2 秒后终止且 runtime 恢复 READY；
- 390px 宽度下编辑器和目录可用。
