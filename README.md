# TCL/DOJO

别背语法，把流程跑起来。

TCL/DOJO 是一个面向 EDA / FPGA 自动化场景的中文交互式 Tcl 学习站。它把语言知识、工程脚本能力和 Vivado 风格对象数据库分层组织，让学习者从第一条 `set` / `puts` 一路练到约束审计、时序分诊和完整构建门禁。

线上版本：<https://tcl-dojo-eda.aialra0.chatgpt.site>

## 它与普通 Tcl 教程有什么不同

- **真实 Tcl 8.6 内核**：Wacl/WebAssembly 在浏览器中执行标准 Tcl，不是 JavaScript 仿写语法。
- **渐进课程系统**：7 个阶段、34 课、98 个交互任务，按观察、预测、改写、修错、独立完成、综合实战推进。
- **EDA 设计数据库**：稳定模拟 cells、pins、nets、ports、clocks、timing paths，以及 `get_*`、`get_property`、`filter`、`-of_objects` 等核心对象操作。
- **流程模拟**：覆盖 Project Mode、Non-Project Mode、report、checkpoint、batch 参数和 QoR gate。
- **两套可视化**：求值透镜解释 `$`、`[]`、`{}` 的替换时机；对象数据库展示查询轨迹和流程事件。
- **安全执行边界**：每次运行进入独立 child interpreter；死循环 2 秒后终止 Worker 并自动重启。
- **可恢复学习状态**：当前课程、完成进度和代码草稿保存在本机 `localStorage`。

## 课程地图

| 阶段 | 课程范围 | 学完能做什么 |
| --- | --- | --- |
| 00 启动 | 命令、变量、表达式、错误 | 读改并排错一个短 Tcl 脚本 |
| 01 求值 | `$`、`[]`、`{}`、列表与格式化 | 解释一行 Tcl 为什么得到某个结果 |
| 02 数据流 | 循环、条件、dict、array、regexp | 对批量数据做筛选、统计和汇总 |
| 03 工程化 | proc、作用域、try、文件、argv、namespace | 写带参数和错误边界的命令行脚本 |
| 04 对象 | collections、properties、filters、relationships | 查询并导航 EDA 设计对象 |
| 05 流程 | Project / Non-Project、report、checkpoint、batch | 自动化一条 Vivado 风格流程 |
| 06 实战 | 约束审计、时序分诊、QoR 库、完整门禁 | 带走四个可迁移的工程脚本骨架 |

## 技术架构

```text
React / vinext UI
        │
        ├── 数据驱动课程与判题规则
        ├── localStorage 进度 / 草稿
        └── Web Worker（2 秒超时）
                 │
                 ├── Wacl / Tcl 8.6.6 / WebAssembly
                 ├── 每次执行创建隔离 child interpreter
                 └── Tcl 编写的 Vivado 风格设计数据库与流程模拟
```

课程数据在 [`app/course-data.ts`](app/course-data.ts)，浏览器运行时和 EDA prelude 在 [`public/tcl-worker.js`](public/tcl-worker.js)，界面在 [`app/TclDojo.tsx`](app/TclDojo.tsx)。

## 本地开发

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。

常用命令：

```bash
npm run build
npm test
npm run lint
```

`npm test` 会先执行生产构建，再检查服务端渲染、课程数量与 ID 完整性、Wacl 运行资产和隔离边界。发布前还通过真实 Chromium 批量执行全部 83 个代码题参考答案。

## 运行时说明

标准 Tcl 命令由 Wacl 的 Tcl 8.6.6 WebAssembly 内核执行。EDA 命令属于课程内置的**教学模拟层**：它保持查询集合、读取属性、过滤、关系导航和流程状态等关键心智模型，但不声称完整复刻任何特定版本的 Vivado。

迁移到真实工程时：

1. 在目标工具版本中使用 `help` / `list_property` 核对命令与属性。
2. 把教学数据库替换为真实 `get_*` 查询。
3. 在小设计上验证零匹配、错误传播、路径和报告输出。
4. 再接入 CI 或长时间 batch flow。

## 浏览器兼容性

需要支持 WebAssembly、Web Worker、`TextEncoder` 和 ES2022 的现代浏览器。首次加载会下载约 4.5 MB 的 Tcl/Wacl 运行资产，随后可由浏览器缓存。

## 第三方软件

Tcl WebAssembly 运行时来自 [Wacl](https://github.com/ecky-l/wacl)。仓库保留了其 BSD 3-Clause 许可和 Tcl 许可文本；详见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) 与 [`public/vendor/wacl`](public/vendor/wacl)。

## 贡献

课程内容、题目、工具方言适配与 UI 改进都欢迎贡献。开始前请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
