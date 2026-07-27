import type {
  Challenge,
  ChallengeKind,
  CourseModule,
  Lesson,
  RunExpectation,
} from "./course-types";

type ChallengeExtras = {
  explanation?: string;
  options?: string[];
  answer?: number;
};

function challenge(
  id: string,
  kind: ChallengeKind,
  title: string,
  prompt: string,
  starter: string,
  solution: string,
  hint: string,
  success: string,
  expectation?: RunExpectation,
  extras: ChallengeExtras = {},
): Challenge {
  return {
    id,
    kind,
    title,
    prompt,
    starter,
    solution,
    hint,
    success,
    expectation,
    ...extras,
  };
}

function lesson(
  id: string,
  number: string,
  moduleId: string,
  eyebrow: string,
  title: string,
  duration: string,
  mission: string,
  rule: string,
  fieldNote: string,
  concepts: string[],
  challenges: Challenge[],
): Lesson {
  return {
    id,
    number,
    moduleId,
    eyebrow,
    title,
    duration,
    mission,
    rule,
    fieldNote,
    concepts,
    challenges,
  };
}

export const courseModules: CourseModule[] = [
  {
    id: "start",
    index: "00",
    title: "先让脚本干活",
    shortTitle: "启动",
    description: "不背语法表。先把 Tcl 当作一条能重复执行的工程命令链。",
    outcome: "能读懂、修改并排错一个十几行的 Tcl 脚本。",
    lessons: [
      lesson(
        "first-command",
        "01",
        "start",
        "把手工参数变成旋钮",
        "命令、参数、结果",
        "8 min",
        "用三条命令配置目标频率，并看懂 Tcl 的“命令就是调用”。",
        "Tcl 每一行通常都是：命令 参数 参数。命令执行后还会产生一个结果。",
        "在 EDA 控制台里，set、get_*、report_* 看起来不同，本质都是同一种命令调用。",
        ["set", "puts", "命令结果"],
        [
          challenge(
            "first-command-observe",
            "observe",
            "先运行，不要改",
            "观察 set 的结果如何被 $frequency 取出。",
            `set frequency 150
puts "Target: $frequency MHz"`,
            `set frequency 150
puts "Target: $frequency MHz"`,
            "直接点击“运行并检查”。",
            "你已经完成第一次真实 Tcl 8.6 执行。",
            { outputExact: ["Target: 150 MHz"] },
            {
              explanation:
                "set frequency 150 把值保存到变量；$frequency 在 puts 执行前被替换为 150。",
            },
          ),
          challenge(
            "first-command-edit",
            "edit",
            "改一个工程参数",
            "把目标频率从 150 MHz 改为 200 MHz。",
            `set frequency 150
puts "Target: $frequency MHz"`,
            `set frequency 200
puts "Target: $frequency MHz"`,
            "只改 set 后面的数字。",
            "参数化成功：以后脚本只需要改一个入口值。",
            { outputExact: ["Target: 200 MHz"] },
          ),
          challenge(
            "first-command-create",
            "create",
            "自己拼一条状态消息",
            "定义变量 stage 为 synth，并精确输出 Stage=synth。",
            `# 在下面写两行 Tcl
`,
            `set stage synth
puts "Stage=$stage"`,
            "第一行 set，第二行 puts；大小写必须一致。",
            "你已经能独立完成“保存—读取—输出”闭环。",
            { outputExact: ["Stage=synth"] },
          ),
        ],
      ),
      lesson(
        "expressions",
        "02",
        "start",
        "把频率换算成周期",
        "表达式与数值",
        "10 min",
        "算出 200 MHz 时钟对应的 5.0 ns 周期。",
        "expr 负责数值计算；把表达式放在花括号里，是 Tcl 最稳妥也最高效的写法。",
        "约束脚本里经常需要 MHz↔ns、百分比、裕量和阈值换算。",
        ["expr", "浮点数", "incr"],
        [
          challenge(
            "expressions-predict",
            "predict",
            "先预测，再执行",
            "这段脚本会输出什么？先选择答案，再运行验证。",
            `set a 7
set b 3
puts [expr {$a + $b * 2}]`,
            `set a 7
set b 3
puts [expr {$a + $b * 2}]`,
            "乘法优先于加法。",
            "正确：expr 遵循常见的算术优先级。",
            undefined,
            {
              options: ["20", "13", "17", "$a + $b * 2"],
              answer: 1,
              explanation:
                "[expr {...}] 先执行并得到 13，这个结果再成为 puts 的参数。",
            },
          ),
          challenge(
            "expressions-repair",
            "repair",
            "修复整数除法",
            "当前结果是 0。让脚本输出 Ratio=0.25。",
            `set used 1
set total 4
set ratio [expr {$used / $total}]
puts "Ratio=$ratio"`,
            `set used 1
set total 4
set ratio [expr {double($used) / $total}]
puts "Ratio=$ratio"`,
            "让参与运算的任意一个数变为浮点数：double($used)。",
            "修好了 Tcl 里最常见的数值陷阱之一。",
            { outputExact: ["Ratio=0.25"] },
          ),
          challenge(
            "expressions-create",
            "create",
            "写一个周期计算器",
            "已知 frequency_mhz=200，计算并输出 Period=5.0 ns。",
            `set frequency_mhz 200
# 1 GHz 对应 1 ns；在下面计算 period_ns

puts "Period=$period_ns ns"`,
            `set frequency_mhz 200
set period_ns [expr {1000.0 / $frequency_mhz}]
puts "Period=$period_ns ns"`,
            "周期(ns) = 1000.0 / 频率(MHz)。",
            "这已经是一段可直接放进约束生成器的计算。",
            { outputExact: ["Period=5.0 ns"] },
          ),
        ],
      ),
      lesson(
        "errors",
        "03",
        "start",
        "让失败变得可读",
        "错误不是终点",
        "11 min",
        "学会读 Tcl 错误，并用 catch 把一次失败转成可处理的数据。",
        "catch 返回状态码，并把脚本结果或错误消息保存到变量。",
        "批处理跑几小时后才失败并不可怕；可怕的是错误没有上下文，也没有被正确传播。",
        ["error", "catch", "errorInfo"],
        [
          challenge(
            "errors-observe",
            "observe",
            "看一次真实错误",
            "运行它，注意终端给出的 Tcl 原生错误。",
            `set design top
puts $desgin`,
            `set design top
puts $desgin`,
            "变量名 desgin 拼错了；这一关的目标就是看到错误。",
            "你找到了变量拼写错误。",
            { errorIncludes: "desgin" },
            {
              explanation:
                "Tcl 在读取不存在的变量时会明确报告变量名。先定位最内层错误，再看调用栈。",
            },
          ),
          challenge(
            "errors-repair",
            "repair",
            "保留失败上下文",
            "补全 catch，让输出精确包含 status=1 和 missing checkpoint。",
            `set status [catch {
    error "missing checkpoint"
} message]

puts "status=$status"
# TODO：输出 message`,
            `set status [catch {
    error "missing checkpoint"
} message]

puts "status=$status"
puts $message`,
            "catch 的第二个参数 message 已经接住了错误文本。",
            "脚本现在能识别失败，而不是直接中断。",
            {
              outputIncludes: ["status=1", "missing checkpoint"],
            },
          ),
          challenge(
            "errors-create",
            "create",
            "写一个前置条件",
            "当 checkpoint 为空时，抛出错误 no checkpoint。",
            `set checkpoint ""

# 用 if 和 error 完成检查
`,
            `set checkpoint ""

if {$checkpoint eq ""} {
    error "no checkpoint"
}`,
            "字符串相等用 eq；主动失败用 error。",
            "你写出了第一条可执行的工程契约。",
            { errorIncludes: "no checkpoint" },
          ),
        ],
      ),
    ],
  },
  {
    id: "evaluation",
    index: "01",
    title: "看懂 Tcl 的求值",
    shortTitle: "求值",
    description: "Tcl 难的不是命令多，而是替换时机。把 $, [] 和 {} 一次看透。",
    outcome: "能解释一行 Tcl 为什么得到某个结果，并避免 80% 的引号与花括号错误。",
    lessons: [
      lesson(
        "substitution",
        "04",
        "evaluation",
        "一行代码的三次替换",
        "$、[] 与反斜杠",
        "12 min",
        "通过求值透镜看清变量替换、命令替换和反斜杠替换。",
        "双引号和裸词允许替换；方括号先执行内部命令，并把结果放回原位置。",
        "get_property 常被嵌进 puts 或 expr；读脚本时，先从最内层方括号往外看。",
        ["$变量", "[命令]", "\\转义"],
        [
          challenge(
            "substitution-predict",
            "predict",
            "从最内层开始",
            "先判断最终输出，再运行。求值透镜会标出替换边界。",
            `set x 4
puts "next=[expr {$x + 1}]"`,
            `set x 4
puts "next=[expr {$x + 1}]"`,
            "先算 [expr {...}]，再执行 puts。",
            "正确：方括号结果 5 被拼进字符串。",
            undefined,
            {
              options: ["next=$x + 1", "next=4 + 1", "next=5", "5"],
              answer: 2,
            },
          ),
          challenge(
            "substitution-edit",
            "edit",
            "嵌入命令结果",
            "不要增加变量；把 llength 的结果直接嵌入输出，得到 cells=3。",
            `set cells {u_cpu u_dma u_uart}
puts "cells=TODO"`,
            `set cells {u_cpu u_dma u_uart}
puts "cells=[llength $cells]"`,
            "双引号里可以放 [llength $cells]。",
            "你已经能从内向外读写嵌套命令。",
            { outputExact: ["cells=3"] },
          ),
          challenge(
            "substitution-create",
            "create",
            "组合两层求值",
            "用一条 puts 输出 first=CPU；数据来自列表中的第一个小写单词。",
            `set blocks {cpu dma uart}
# 一条 puts：先 lindex，再 string toupper
`,
            `set blocks {cpu dma uart}
puts "first=[string toupper [lindex $blocks 0]]"`,
            "最内层 [lindex ...] 得到 cpu，外层 [string toupper ...] 得到 CPU。",
            "你完成了两层命令替换。",
            { outputExact: ["first=CPU"] },
          ),
        ],
      ),
      lesson(
        "braces-quotes",
        "05",
        "evaluation",
        "替换现在发生，还是以后发生",
        "花括号与双引号",
        "13 min",
        "建立最重要的 Tcl 直觉：花括号保护原文，双引号允许替换。",
        "{} 通常延迟替换，\"\" 通常立即替换。控制结构的脚本体几乎总该放在花括号里。",
        "if、foreach、proc 的 body 使用花括号，不只是风格；它决定变量在哪个作用域、哪个时刻求值。",
        ["{}", "\"\"", "延迟求值"],
        [
          challenge(
            "braces-quotes-predict",
            "predict",
            "哪一句保留美元符号",
            "判断两行输出。",
            `set name cpu
puts "$name"
puts {$name}`,
            `set name cpu
puts "$name"
puts {$name}`,
            "双引号允许变量替换；花括号保留原文。",
            "正确：第一行是 cpu，第二行是字面量 $name。",
            undefined,
            {
              options: [
                "cpu / cpu",
                "$name / $name",
                "cpu / $name",
                "$name / cpu",
              ],
              answer: 2,
            },
          ),
          challenge(
            "braces-quotes-repair",
            "repair",
            "修复过早替换",
            "脚本在定义 proc 时就读取了不存在的 name。只改一对定界符，让它输出 hello cpu。",
            `proc greet {name} "
    puts \\"hello $name\\"
"

greet cpu`,
            `proc greet {name} {
    puts "hello $name"
}

greet cpu`,
            "proc 的 body 应该用花括号包起来。",
            "name 现在会在 proc 被调用时、在正确作用域中替换。",
            { outputExact: ["hello cpu"] },
          ),
          challenge(
            "braces-quotes-create",
            "create",
            "安全地写 expr",
            "输出 next=11；expr 的表达式必须放在花括号里。",
            `set count 10
# 使用 puts、expr 和花括号
`,
            `set count 10
puts "next=[expr {$count + 1}]"`,
            "外层为了拼字符串用双引号，expr 的参数用花括号。",
            "你把立即替换与延迟替换组合在了一起。",
            { outputExact: ["next=11"] },
          ),
        ],
      ),
      lesson(
        "lists-are-values",
        "06",
        "evaluation",
        "Tcl 列表不是字符串拼接",
        "一等公民的列表",
        "14 min",
        "安全地构造、索引和切片列表，不靠手工拼空格。",
        "用 list 构造列表，用 lindex/llength/lrange 读取；不要手写可能含空格的列表字符串。",
        "工具返回的 collection 在 Tcl 层常表现得像列表，但对象句柄仍要原样传递给工具命令。",
        ["list", "lindex", "llength", "lrange"],
        [
          challenge(
            "lists-values-predict",
            "predict",
            "一个元素还是两个元素",
            "判断列表长度。",
            `set files [list "rtl/top module.v" constraints.xdc]
puts [llength $files]`,
            `set files [list "rtl/top module.v" constraints.xdc]
puts [llength $files]`,
            "list 会正确保护包含空格的文件名。",
            "正确：这是两个列表元素，不是三个单词。",
            undefined,
            {
              options: ["1", "2", "3", "报错"],
              answer: 1,
            },
          ),
          challenge(
            "lists-values-repair",
            "repair",
            "修复脆弱的列表",
            "不改文件名，让输出 first=rtl/top module.v。",
            `set first "rtl/top module.v"
set second constraints.xdc
set files "$first $second"
puts "first=[lindex $files 0]"`,
            `set first "rtl/top module.v"
set second constraints.xdc
set files [list $first $second]
puts "first=[lindex $files 0]"`,
            "用 [list $first $second] 构造列表。",
            "含空格的路径现在仍是一个完整元素。",
            { outputExact: ["first=rtl/top module.v"] },
          ),
          challenge(
            "lists-values-create",
            "create",
            "取最后两项",
            "从阶段列表中输出 place route。",
            `set stages {read synth opt place route}
# 用 lrange 输出最后两项
`,
            `set stages {read synth opt place route}
puts [lrange $stages end-1 end]`,
            "lrange 的索引支持 end 和 end-1。",
            "你已经能安全切片流水线阶段。",
            { outputExact: ["place route"] },
          ),
        ],
      ),
      lesson(
        "strings-format",
        "07",
        "evaluation",
        "让报告既给人看也给机器读",
        "字符串、格式化与拆分",
        "14 min",
        "使用 format、string、split 和 join 生成稳定输出。",
        "机器报告要固定字段和精度；format 比随意拼接更可靠。",
        "脚本往往是工具和 CI 之间的接口，输出格式稳定性就是兼容性。",
        ["format", "string", "split", "join"],
        [
          challenge(
            "strings-format-predict",
            "predict",
            "固定小数位",
            "判断格式化结果。",
            `set slack -0.23456
puts [format "WNS=%+.2f ns" $slack]`,
            `set slack -0.23456
puts [format "WNS=%+.2f ns" $slack]`,
            "%+ 显示正负号，.2f 保留两位小数。",
            "正确：报告现在具有稳定精度。",
            undefined,
            {
              options: [
                "WNS=-0.23 ns",
                "WNS=-0.23456 ns",
                "WNS=0.23 ns",
                "WNS=%+.2f ns",
              ],
              answer: 0,
            },
          ),
          challenge(
            "strings-format-edit",
            "edit",
            "规范模块名",
            "把输入两端空格去掉并转成小写，输出 block=u_cpu。",
            `set raw "  U_CPU  "
set block $raw
puts "block=$block"`,
            `set raw "  U_CPU  "
set block [string tolower [string trim $raw]]
puts "block=$block"`,
            "先 string trim，再 string tolower。",
            "输入数据已被规范化。",
            { outputExact: ["block=u_cpu"] },
          ),
          challenge(
            "strings-format-create",
            "create",
            "生成 CSV 行",
            "把列表中的三个字段用逗号连接，输出 cpu,-0.23,8。",
            `set row [list cpu -0.23 8]
# 使用 join
`,
            `set row [list cpu -0.23 8]
puts [join $row ,]`,
            "join 的第二个参数是分隔符。",
            "你生成了可交给表格和 CI 的结构化数据。",
            { outputExact: ["cpu,-0.23,8"] },
          ),
        ],
      ),
    ],
  },
  {
    id: "data-control",
    index: "02",
    title: "批量处理与决策",
    shortTitle: "数据流",
    description: "把对象放进集合，用循环、条件和字典表达工程规则。",
    outcome: "能对一批时序、资源或文件做筛选、统计和汇总。",
    lessons: [
      lesson(
        "foreach",
        "08",
        "data-control",
        "一次处理一整个集合",
        "foreach 与解构",
        "13 min",
        "遍历三条时序记录，并用 lassign 拆出起点、终点和 slack。",
        "foreach 负责重复，lassign 负责把一条列表记录拆成命名字段。",
        "这套模式会反复出现在 get_cells、get_pins、get_timing_paths 的结果处理中。",
        ["foreach", "lassign", "lappend"],
        [
          challenge(
            "foreach-observe",
            "observe",
            "读懂一条批处理",
            "运行并观察循环变量 path 每次取一整条记录。",
            `set paths {
    {cpu/a mem/b -0.23}
    {dma/c cpu/d  0.15}
    {uart/e cpu/f -0.05}
}

foreach path $paths {
    lassign $path from to slack
    puts "$from -> $to : $slack"
}`,
            `set paths {
    {cpu/a mem/b -0.23}
    {dma/c cpu/d  0.15}
    {uart/e cpu/f -0.05}
}

foreach path $paths {
    lassign $path from to slack
    puts "$from -> $to : $slack"
}`,
            "直接运行，注意输出顺序和输入顺序一致。",
            "三条记录已经被逐条解构。",
            {
              outputIncludes: [
                "cpu/a -> mem/b : -0.23",
                "dma/c -> cpu/d : 0.15",
                "uart/e -> cpu/f : -0.05",
              ],
            },
          ),
          challenge(
            "foreach-repair",
            "repair",
            "从只跑一次变成全部遍历",
            "当前只处理第一条。修复 foreach，让 count=3。",
            `set cells {u_cpu u_dma u_uart}
set count 0

foreach cell [lindex $cells 0] {
    incr count
}
puts "count=$count"`,
            `set cells {u_cpu u_dma u_uart}
set count 0

foreach cell $cells {
    incr count
}
puts "count=$count"`,
            "foreach 的第三个成分应该是整个 $cells。",
            "复制粘贴式处理已经变成真正的批处理。",
            { outputExact: ["count=3"] },
          ),
          challenge(
            "foreach-create",
            "create",
            "收集而不是立刻打印",
            "把 stages 中每个名字转成大写并收集到 result，最后输出 SYNTH PLACE ROUTE。",
            `set stages {synth place route}
set result {}

# foreach + lappend + string toupper

puts $result`,
            `set stages {synth place route}
set result {}

foreach stage $stages {
    lappend result [string toupper $stage]
}

puts $result`,
            "循环体里：lappend result [string toupper $stage]。",
            "你掌握了 Tcl 中最常用的 map 模式。",
            { outputExact: ["SYNTH PLACE ROUTE"] },
          ),
        ],
      ),
      lesson(
        "conditions",
        "09",
        "data-control",
        "把工程经验写成规则",
        "if、elseif 与布尔表达式",
        "14 min",
        "按照 slack 把路径分成 FAIL、WARN 和 PASS。",
        "if 的条件用花括号；数值比较用 < >，字符串比较用 eq ne。",
        "自动签核的核心不是更复杂的 Tcl，而是把“什么算异常”明确写出来。",
        ["if", "elseif", "eq/ne", "&&/||"],
        [
          challenge(
            "conditions-predict",
            "predict",
            "边界属于哪一档",
            "slack 恰好为 0 时输出什么？",
            `set slack 0
if {$slack < 0} {
    puts FAIL
} elseif {$slack < 0.1} {
    puts WARN
} else {
    puts PASS
}`,
            `set slack 0
if {$slack < 0} {
    puts FAIL
} elseif {$slack < 0.1} {
    puts WARN
} else {
    puts PASS
}`,
            "0 不小于 0，但小于 0.1。",
            "正确：边界条件必须刻意设计。",
            undefined,
            { options: ["FAIL", "WARN", "PASS", "没有输出"], answer: 1 },
          ),
          challenge(
            "conditions-edit",
            "edit",
            "只统计严重违例",
            "把阈值改为 -0.10，只让 -0.23 计入，输出 serious=1。",
            `set slacks {-0.23 0.15 -0.05}
set threshold 0
set serious 0

foreach slack $slacks {
    if {$slack < $threshold} {
        incr serious
    }
}
puts "serious=$serious"`,
            `set slacks {-0.23 0.15 -0.05}
set threshold -0.10
set serious 0

foreach slack $slacks {
    if {$slack < $threshold} {
        incr serious
    }
}
puts "serious=$serious"`,
            "只需要把 threshold 设为 -0.10。",
            "脚本现在表达了“严重”的业务定义。",
            { outputExact: ["serious=1"] },
          ),
          challenge(
            "conditions-create",
            "create",
            "检查两个条件",
            "只有利用率超过 80 且 WNS 小于 0 时输出 RISK。",
            `set utilization 86
set wns -0.12

# 写 if；用 &&
`,
            `set utilization 86
set wns -0.12

if {$utilization > 80 && $wns < 0} {
    puts RISK
}`,
            "条件写成 {$utilization > 80 && $wns < 0}。",
            "你把两个指标合成了一个可执行风险规则。",
            { outputExact: ["RISK"] },
          ),
        ],
      ),
      lesson(
        "loops",
        "10",
        "data-control",
        "可控地重复",
        "for、while 与流程控制",
        "15 min",
        "实现重试、编号和提前退出。",
        "for 适合已知次数，while 适合状态驱动；break 退出，continue 跳过本轮。",
        "轮询 run 状态和有限次数重试都需要退出条件；写循环时先问“怎样保证它停”。",
        ["for", "while", "break", "continue"],
        [
          challenge(
            "loops-predict",
            "predict",
            "continue 跳过什么",
            "判断输出。",
            `for {set i 0} {$i < 5} {incr i} {
    if {$i == 2} { continue }
    puts -nonewline $i
}`,
            `for {set i 0} {$i < 5} {incr i} {
    if {$i == 2} { continue }
    puts -nonewline $i
}`,
            "i=2 时跳到下一轮，但循环继续。",
            "正确：continue 只跳过当前轮。",
            undefined,
            { options: ["01234", "0134", "01", "34"], answer: 1 },
          ),
          challenge(
            "loops-repair",
            "repair",
            "修复不会结束的重试",
            "补上计数更新，让它输出 attempt=1、2、3 后停止。",
            `set attempt 0
while {$attempt < 3} {
    puts "attempt=[expr {$attempt + 1}]"
    # TODO：更新 attempt
}`,
            `set attempt 0
while {$attempt < 3} {
    puts "attempt=[expr {$attempt + 1}]"
    incr attempt
}`,
            "循环体最后加 incr attempt。",
            "循环现在有明确的进展变量和退出条件。",
            {
              outputExact: ["attempt=1", "attempt=2", "attempt=3"],
            },
          ),
          challenge(
            "loops-create",
            "create",
            "找到第一个失败就停",
            "遍历状态列表，在首次 FAIL 时输出 stop=2 并退出。",
            `set states {PASS PASS FAIL PASS}
set index 0

# foreach、if、break
`,
            `set states {PASS PASS FAIL PASS}
set index 0

foreach state $states {
    if {$state eq "FAIL"} {
        puts "stop=$index"
        break
    }
    incr index
}`,
            "每轮检查 state；不是 FAIL 时再 incr index。",
            "你实现了 fail-fast 控制流。",
            { outputExact: ["stop=2"] },
          ),
        ],
      ),
      lesson(
        "dicts",
        "11",
        "data-control",
        "给数据字段命名",
        "dict：轻量结构化数据",
        "16 min",
        "用字典保存一次构建的器件、WNS 和状态。",
        "dict create/get/set/exists 让数据按字段访问，比依赖列表位置更清楚。",
        "脚本配置、QoR 摘要和跨过程返回值都很适合用 dict 表达。",
        ["dict create", "dict get", "dict set", "dict exists"],
        [
          challenge(
            "dicts-predict",
            "predict",
            "读取嵌套字段",
            "判断输出。",
            `set run [dict create name impl_1 metrics [dict create wns -0.23]]
puts [dict get $run metrics wns]`,
            `set run [dict create name impl_1 metrics [dict create wns -0.23]]
puts [dict get $run metrics wns]`,
            "dict get 可以连续给出嵌套键。",
            "正确：嵌套结构避免了平铺变量泛滥。",
            undefined,
            { options: ["impl_1", "metrics", "-0.23", "报错"], answer: 2 },
          ),
          challenge(
            "dicts-edit",
            "edit",
            "更新构建状态",
            "把 status 从 running 更新为 passed，输出 impl_1=passed。",
            `set run [dict create name impl_1 status running]
# 更新 status
puts "[dict get $run name]=[dict get $run status]"`,
            `set run [dict create name impl_1 status running]
dict set run status passed
puts "[dict get $run name]=[dict get $run status]"`,
            "使用 dict set run status passed。",
            "状态被原位更新，同时保留其他字段。",
            { outputExact: ["impl_1=passed"] },
          ),
          challenge(
            "dicts-create",
            "create",
            "安全读取可选配置",
            "只有存在 jobs 键时才输出 jobs=8。",
            `set config [dict create part xc7a200t jobs 8]

# dict exists + dict get
`,
            `set config [dict create part xc7a200t jobs 8]

if {[dict exists $config jobs]} {
    puts "jobs=[dict get $config jobs]"
}`,
            "条件是 {[dict exists $config jobs]}。",
            "你的配置读取不再依赖每个键都存在。",
            { outputExact: ["jobs=8"] },
          ),
        ],
      ),
      lesson(
        "arrays",
        "12",
        "data-control",
        "按键累计统计",
        "array：可变查找表",
        "15 min",
        "统计每种 cell 类型出现的次数。",
        "array 是变量名下的一组键值；info exists 可在首次计数前初始化。",
        "字典适合当值传递，array 适合在单个作用域中频繁增量更新。",
        ["array set", "$a(key)", "info exists", "array names"],
        [
          challenge(
            "arrays-observe",
            "observe",
            "读取数组元素",
            "运行并观察括号中的键也可以来自变量。",
            `array set count {FDRE 4 LUT6 2}
set kind FDRE
puts "$kind=$count($kind)"`,
            `array set count {FDRE 4 LUT6 2}
set kind FDRE
puts "$kind=$count($kind)"`,
            "直接运行。",
            "数组键完成了动态查找。",
            { outputExact: ["FDRE=4"] },
          ),
          challenge(
            "arrays-repair",
            "repair",
            "修复首次计数",
            "当前读取不存在的元素会报错。初始化后输出 FDRE=2。",
            `set kinds {FDRE FDRE}
array set count {}

foreach kind $kinds {
    incr count($kind)
}
puts "FDRE=$count(FDRE)"`,
            `set kinds {FDRE FDRE}
array set count {}

foreach kind $kinds {
    if {![info exists count($kind)]} {
        set count($kind) 0
    }
    incr count($kind)
}
puts "FDRE=$count(FDRE)"`,
            "incr 前先用 info exists 检查并设为 0。",
            "计数器可以安全遇到新类型了。",
            { outputExact: ["FDRE=2"] },
          ),
          challenge(
            "arrays-create",
            "create",
            "输出排序后的键",
            "把数组的键排序后输出 FDRE LUT6 RAMB36。",
            `array set count {LUT6 2 RAMB36 1 FDRE 4}
# array names + lsort
`,
            `array set count {LUT6 2 RAMB36 1 FDRE 4}
puts [lsort [array names count]]`,
            "先 array names count，再把结果交给 lsort。",
            "你的统计输出现在具有稳定顺序。",
            { outputExact: ["FDRE LUT6 RAMB36"] },
          ),
        ],
      ),
      lesson(
        "regexp",
        "13",
        "data-control",
        "从日志里提取信号",
        "regexp 与 regsub",
        "16 min",
        "从一行工具日志中提取 WNS，并判断是否失败。",
        "regexp 用捕获组提取字段；先写清边界，再决定是否需要更复杂的正则。",
        "当工具没有结构化 API 时，日志解析是最后手段；要用测试样本保护它。",
        ["regexp", "捕获组", "regsub"],
        [
          challenge(
            "regexp-predict",
            "predict",
            "捕获组得到什么",
            "判断 wns 的值。",
            `set line "Timing: WNS=-0.230 ns"
regexp {WNS=([-0-9.]+)} $line whole wns
puts $wns`,
            `set line "Timing: WNS=-0.230 ns"
regexp {WNS=([-0-9.]+)} $line whole wns
puts $wns`,
            "whole 是完整匹配；wns 是第一个括号捕获组。",
            "正确：字段值已经从日志中分离。",
            undefined,
            { options: ["Timing", "WNS=-0.230", "-0.230", "ns"], answer: 2 },
          ),
          challenge(
            "regexp-edit",
            "edit",
            "同时支持正负数",
            "修复模式，让它从 WNS=+0.150 中提取 +0.150。",
            `set line "Timing: WNS=+0.150 ns"
regexp {WNS=([-0-9.]+)} $line whole wns
puts $wns`,
            `set line "Timing: WNS=+0.150 ns"
regexp {WNS=([+\\-0-9.]+)} $line whole wns
puts $wns`,
            "字符类里还要允许加号；把 + 加进去。",
            "解析器现在覆盖正、负两种 slack。",
            { outputExact: ["+0.150"] },
          ),
          challenge(
            "regexp-create",
            "create",
            "替换敏感路径",
            "把 /home/alice/project 中的 alice 替换为 USER。",
            `set path "/home/alice/project"
# 使用 regsub
`,
            `set path "/home/alice/project"
regsub {/home/[^/]+} $path {/home/USER} clean
puts $clean`,
            "regsub 模式可写 {/home/[^/]+}。",
            "日志中的机器相关路径已被规范化。",
            { outputExact: ["/home/USER/project"] },
          ),
        ],
      ),
      lesson(
        "switch-sort",
        "14",
        "data-control",
        "分类、排序、选择",
        "switch、lsort 与 lsearch",
        "15 min",
        "按文件扩展名选择读取命令，并把数值正确排序。",
        "switch 适合离散分支；lsort 要明确 -integer 或 -real，避免字典序陷阱。",
        "文件分派和报告排名看似小事，但稳定规则能让脚本在规模变大后仍可维护。",
        ["switch", "lsort", "lsearch"],
        [
          challenge(
            "switch-sort-predict",
            "predict",
            "默认是字典序",
            "默认 lsort 的结果是什么？",
            `puts [lsort {2 10 1}]`,
            `puts [lsort {2 10 1}]`,
            "默认按字符串排序，字符 1 在 2 前面。",
            "正确：数值排序必须显式写 -integer 或 -real。",
            undefined,
            { options: ["1 2 10", "1 10 2", "10 2 1", "报错"], answer: 1 },
          ),
          challenge(
            "switch-sort-repair",
            "repair",
            "改成数值排序",
            "只改 lsort 选项，输出 -0.23 -0.05 0.15。",
            `set slacks {-0.05 0.15 -0.23}
puts [lsort $slacks]`,
            `set slacks {-0.05 0.15 -0.23}
puts [lsort -real $slacks]`,
            "加入 -real。",
            "slack 现在按真实数值排序。",
            { outputExact: ["-0.23 -0.05 0.15"] },
          ),
          challenge(
            "switch-sort-create",
            "create",
            "按扩展名分派",
            "当 ext 为 .xdc 时输出 constraints。",
            `set ext .xdc

# switch -- $ext { ... }
`,
            `set ext .xdc

switch -- $ext {
    .v   { puts rtl }
    .xdc { puts constraints }
    default { puts unknown }
}`,
            "为 .xdc 写一个分支；保留 default。",
            "脚本已经能根据输入类型选择处理策略。",
            { outputExact: ["constraints"] },
          ),
        ],
      ),
    ],
  },
  {
    id: "engineering",
    index: "03",
    title: "把片段写成工程脚本",
    shortTitle: "工程化",
    description: "用过程、作用域、文件、参数和命名空间把一次性代码变成可复用工具。",
    outcome: "能写一个带参数、错误处理、配置输入和清晰边界的命令行 Tcl 脚本。",
    lessons: [
      lesson(
        "procedures",
        "15",
        "engineering",
        "封装一个可测试动作",
        "proc、参数与 return",
        "17 min",
        "把 slack 分类逻辑封装为 procedure，并在三个输入上复用。",
        "proc name {args} {body} 定义过程；参数默认是局部变量，return 明确返回值。",
        "可复用工程脚本不是一条超长主流程，而是一组名字清楚、输入输出清楚的小过程。",
        ["proc", "默认参数", "return", "args"],
        [
          challenge(
            "procedures-observe",
            "observe",
            "调用和返回",
            "运行并观察过程的返回值如何成为 puts 的参数。",
            `proc classify {slack} {
    if {$slack < 0} { return FAIL }
    return PASS
}

puts [classify -0.12]`,
            `proc classify {slack} {
    if {$slack < 0} { return FAIL }
    return PASS
}

puts [classify -0.12]`,
            "直接运行。",
            "输入、规则、返回值形成了独立单元。",
            { outputExact: ["FAIL"] },
          ),
          challenge(
            "procedures-repair",
            "repair",
            "补上默认参数",
            "让 classify -0.05 使用默认阈值 -0.10，输出 PASS。",
            `proc classify {slack threshold} {
    if {$slack < $threshold} { return FAIL }
    return PASS
}

puts [classify -0.05]`,
            `proc classify {slack {threshold -0.10}} {
    if {$slack < $threshold} { return FAIL }
    return PASS
}

puts [classify -0.05]`,
            "参数列表中把 threshold 写成 {threshold -0.10}。",
            "过程既有安全默认值，也允许调用者覆盖。",
            { outputExact: ["PASS"] },
          ),
          challenge(
            "procedures-create",
            "create",
            "接受任意数量参数",
            "写 proc worst {args}，返回所有输入中的最小值 -0.23。",
            `# 定义 worst；可使用 lsort -real

puts [worst -0.05 0.15 -0.23]`,
            `proc worst {args} {
    return [lindex [lsort -real $args] 0]
}

puts [worst -0.05 0.15 -0.23]`,
            "args 会收集剩余参数；排序后取第 0 项。",
            "你写出了一个变长参数工具函数。",
            { outputExact: ["-0.23"] },
          ),
        ],
      ),
      lesson(
        "scope",
        "16",
        "engineering",
        "明确谁拥有这个变量",
        "局部、global 与 upvar",
        "17 min",
        "理解过程作用域，并用 upvar 实现安全的调用者变量更新。",
        "过程默认拥有独立局部作用域；显式连接外部变量，避免隐藏依赖。",
        "大型工具会定义很多全局状态；你的脚本应尽量通过参数传值，只在边界处显式访问共享状态。",
        ["局部作用域", "global", "upvar"],
        [
          challenge(
            "scope-predict",
            "predict",
            "同名但不是同一个变量",
            "判断最终输出。",
            `set stage synth
proc change {} {
    set stage route
}
change
puts $stage`,
            `set stage synth
proc change {} {
    set stage route
}
change
puts $stage`,
            "proc 内的 stage 默认是局部变量。",
            "正确：外层 stage 仍是 synth。",
            undefined,
            { options: ["synth", "route", "空字符串", "报错"], answer: 0 },
          ),
          challenge(
            "scope-edit",
            "edit",
            "显式访问全局配置",
            "只在 proc 中加一行，让它输出 part=xc7a200t。",
            `set part xc7a200t
proc show_part {} {
    puts "part=$part"
}
show_part`,
            `set part xc7a200t
proc show_part {} {
    global part
    puts "part=$part"
}
show_part`,
            "在过程内声明 global part。",
            "共享依赖现在是显式的。",
            { outputExact: ["part=xc7a200t"] },
          ),
          challenge(
            "scope-create",
            "create",
            "通过名字更新调用者变量",
            "补全 bump，使它把外层 count 从 2 改成 3。",
            `proc bump {variableName} {
    # upvar 1 ...
    incr value
}

set count 2
bump count
puts "count=$count"`,
            `proc bump {variableName} {
    upvar 1 $variableName value
    incr value
}

set count 2
bump count
puts "count=$count"`,
            "upvar 1 $variableName value 把调用者变量映射为局部名 value。",
            "你理解了 Tcl pass-by-name 的核心机制。",
            { outputExact: ["count=3"] },
          ),
        ],
      ),
      lesson(
        "robustness",
        "17",
        "engineering",
        "失败要带着上下文返回",
        "try、catch 与 finally",
        "18 min",
        "为一个可能失败的步骤补充上下文，并保证清理动作执行。",
        "try/on error/finally 能把正常路径、错误转换和清理分开表达。",
        "工程脚本应在最知道上下文的地方补充信息，在最外层决定退出码。",
        ["try", "on error", "finally", "return -code error"],
        [
          challenge(
            "robustness-predict",
            "predict",
            "finally 一定执行",
            "判断两行输出顺序。",
            `try {
    puts work
} finally {
    puts cleanup
}`,
            `try {
    puts work
} finally {
    puts cleanup
}`,
            "没有错误时 finally 也会执行。",
            "正确：先 work，后 cleanup。",
            undefined,
            {
              options: [
                "只有 work",
                "只有 cleanup",
                "work / cleanup",
                "cleanup / work",
              ],
              answer: 2,
            },
          ),
          challenge(
            "robustness-repair",
            "repair",
            "加上步骤上下文",
            "让最终错误包含 synth failed: tool crashed。",
            `proc synth {} {
    error "tool crashed"
}

try {
    synth
} on error {message options} {
    return -code error $message
}`,
            `proc synth {} {
    error "tool crashed"
}

try {
    synth
} on error {message options} {
    return -code error "synth failed: $message"
}`,
            "在重新抛出时把 synth failed: 拼到 message 前。",
            "底层错误没有丢失，同时多了工程阶段。",
            { errorIncludes: "synth failed: tool crashed" },
          ),
          challenge(
            "robustness-create",
            "create",
            "捕获但不吞掉",
            "调用 risky；捕获错误后输出 ERROR: missing xdc。",
            `proc risky {} { error "missing xdc" }

# catch + if
`,
            `proc risky {} { error "missing xdc" }

if {[catch {risky} message]} {
    puts "ERROR: $message"
}`,
            "catch 返回非零表示失败。",
            "错误已被转换成稳定的用户输出。",
            { outputExact: ["ERROR: missing xdc"] },
          ),
        ],
      ),
      lesson(
        "files",
        "18",
        "engineering",
        "把结果写进可交付文件",
        "文件 I/O 与资源关闭",
        "19 min",
        "在浏览器虚拟文件系统中创建、读取并关闭报告文件。",
        "open 返回 channel；puts 写入；close 必须执行。读取小文件可用 read。",
        "真实批处理中，报告、检查点和日志都依赖路径管理；路径应由配置传入，不要散落硬编码。",
        ["open", "puts $channel", "close", "read", "file"],
        [
          challenge(
            "files-observe",
            "observe",
            "写入再读回",
            "运行后，Wacl 的内存文件系统会完成一次真实 I/O。",
            `set path /tmp/qor.txt
set channel [open $path w]
puts $channel "WNS=-0.23"
close $channel

set channel [open $path r]
set content [string trim [read $channel]]
close $channel
puts $content`,
            `set path /tmp/qor.txt
set channel [open $path w]
puts $channel "WNS=-0.23"
close $channel

set channel [open $path r]
set content [string trim [read $channel]]
close $channel
puts $content`,
            "直接运行；文件只存在于隔离的浏览器虚拟系统。",
            "你完成了真实 Tcl 文件读写。",
            { outputExact: ["WNS=-0.23"] },
          ),
          challenge(
            "files-repair",
            "repair",
            "修复写入目标",
            "当前 puts 写到了终端而不是文件。修复后读回 status=PASS。",
            `set path /tmp/status.txt
set ch [open $path w]
puts "status=PASS"
close $ch

set ch [open $path r]
puts [string trim [read $ch]]
close $ch`,
            `set path /tmp/status.txt
set ch [open $path w]
puts $ch "status=PASS"
close $ch

set ch [open $path r]
puts [string trim [read $ch]]
close $ch`,
            "写文件时，puts 的第一个参数应是 $ch。",
            "报告内容现在进入了正确 channel。",
            { outputExact: ["status=PASS"] },
          ),
          challenge(
            "files-create",
            "create",
            "安全创建输出目录",
            "若 /tmp/reports 不存在就创建它，最后输出 exists=1。",
            `set output_dir /tmp/reports

# file exists + file mkdir

puts "exists=[file isdirectory $output_dir]"`,
            `set output_dir /tmp/reports

if {![file exists $output_dir]} {
    file mkdir $output_dir
}

puts "exists=[file isdirectory $output_dir]"`,
            "file mkdir 可创建目录；条件里先取反 file exists。",
            "输出路径准备步骤已具备幂等性。",
            { outputExact: ["exists=1"] },
          ),
        ],
      ),
      lesson(
        "cli-config",
        "19",
        "engineering",
        "让脚本从命令行接收配置",
        "argv、argc 与选项解析",
        "18 min",
        "模拟 batch 模式参数，并把 -jobs 8 解析成字典。",
        "argv 是参数列表，argc 是数量。简单脚本可成对遍历，生产脚本要验证未知项和缺失值。",
        "同一份脚本通过参数切换 part、top、jobs 和 output_dir，才能安全进入 CI。",
        ["argv", "argc", "选项字典", "参数校验"],
        [
          challenge(
            "cli-predict",
            "predict",
            "argv 也是列表",
            "判断输出。",
            `set argv {-top soc_top -jobs 8}
set argc [llength $argv]
puts "$argc:[lindex $argv 1]"`,
            `set argv {-top soc_top -jobs 8}
set argc [llength $argv]
puts "$argc:[lindex $argv 1]"`,
            "argv 有四个元素，索引 1 是 soc_top。",
            "正确：参数解析从普通列表操作开始。",
            undefined,
            { options: ["2:-top", "4:soc_top", "4:-jobs", "2:soc_top"], answer: 1 },
          ),
          challenge(
            "cli-repair",
            "repair",
            "按两项一组遍历",
            "修复循环步长，输出 jobs=8。",
            `set argv {-top soc_top -jobs 8}
set options {}

for {set i 0} {$i < [llength $argv]} {incr i} {
    set key [string trimleft [lindex $argv $i] -]
    set value [lindex $argv [expr {$i + 1}]]
    dict set options $key $value
}
puts "jobs=[dict get $options jobs]"`,
            `set argv {-top soc_top -jobs 8}
set options {}

for {set i 0} {$i < [llength $argv]} {incr i 2} {
    set key [string trimleft [lindex $argv $i] -]
    set value [lindex $argv [expr {$i + 1}]]
    dict set options $key $value
}
puts "jobs=[dict get $options jobs]"`,
            "for 的更新部分改成 incr i 2。",
            "选项和值不再错位。",
            { outputExact: ["jobs=8"] },
          ),
          challenge(
            "cli-create",
            "create",
            "拒绝奇数个参数",
            "argv 有 3 项时抛出 options require values。",
            `set argv {-top soc_top -jobs}

# 用余数检查列表长度
`,
            `set argv {-top soc_top -jobs}

if {[llength $argv] % 2 != 0} {
    error "options require values"
}`,
            "条件可写 {[llength $argv] % 2 != 0}。",
            "脚本会在真正启动工具流程前拒绝坏输入。",
            { errorIncludes: "options require values" },
          ),
        ],
      ),
      lesson(
        "namespaces",
        "20",
        "engineering",
        "给大型脚本划边界",
        "namespace 与 package",
        "18 min",
        "把配置和辅助过程放进 ::qor 命名空间，避免污染全局命令。",
        "命名空间组织变量和命令；variable 在命名空间过程内连接命名空间变量。",
        "可复用 Tcl 库应有自己的命名空间和 package 版本，而不是向工具全局环境撒几十个 proc。",
        ["namespace eval", "variable", "namespace export", "package provide"],
        [
          challenge(
            "namespaces-observe",
            "observe",
            "限定名就是清晰边界",
            "运行 ::qor::classify，并观察它不会与全局 classify 冲突。",
            `namespace eval ::qor {
    proc classify {slack} {
        expr {$slack < 0 ? "FAIL" : "PASS"}
    }
}

puts [::qor::classify -0.12]`,
            `namespace eval ::qor {
    proc classify {slack} {
        expr {$slack < 0 ? "FAIL" : "PASS"}
    }
}

puts [::qor::classify -0.12]`,
            "直接运行。",
            "命令的所有权从名字上就能看出来。",
            { outputExact: ["FAIL"] },
          ),
          challenge(
            "namespaces-repair",
            "repair",
            "连接命名空间变量",
            "让 threshold 在过程内可见，输出 FAIL。",
            `namespace eval ::qor {
    variable threshold -0.10
    proc classify {slack} {
        if {$slack < $threshold} { return FAIL }
        return PASS
    }
}
puts [::qor::classify -0.23]`,
            `namespace eval ::qor {
    variable threshold -0.10
    proc classify {slack} {
        variable threshold
        if {$slack < $threshold} { return FAIL }
        return PASS
    }
}
puts [::qor::classify -0.23]`,
            "在 proc 里声明 variable threshold。",
            "配置现在由命名空间拥有并被显式访问。",
            { outputExact: ["FAIL"] },
          ),
          challenge(
            "namespaces-create",
            "create",
            "提供包版本",
            "声明 package qor 版本 1.0，并输出 version=1.0。",
            `namespace eval ::qor {}

# package provide
puts "version=[package present qor]"`,
            `namespace eval ::qor {}

package provide qor 1.0
puts "version=[package present qor]"`,
            "使用 package provide qor 1.0。",
            "这段代码已经具备成为可加载 Tcl 包的最小元数据。",
            { outputExact: ["version=1.0"] },
          ),
        ],
      ),
    ],
  },
  {
    id: "eda-objects",
    index: "04",
    title: "进入 EDA 对象世界",
    shortTitle: "对象",
    description: "在仿真的 Vivado 设计数据库中查询 cells、pins、nets、ports、clocks 和 timing paths。",
    outcome: "能正确查询对象、读取属性、写过滤器，并沿设计关系导航。",
    lessons: [
      lesson(
        "collections",
        "21",
        "eda-objects",
        "工具返回的不是一串名字",
        "对象集合与句柄",
        "17 min",
        "第一次查询真实风格的设计对象，并区分句柄与对象名字。",
        "get_* 返回对象集合；把集合继续传给 get_property，而不是过早把它当普通文本。",
        "Vivado、Quartus、Innovus 的具体 API 不同，但“查询对象—读属性—沿关系导航”是共同模型。",
        ["get_cells", "collection", "get_object_name"],
        [
          challenge(
            "collections-observe",
            "observe",
            "查询所有 cell",
            "运行后同时观察终端和右侧设计数据库。运行轨迹会高亮 7 个 cell。",
            `set cells [get_cells -hier *]
puts "count=[llength $cells]"
puts "first=[get_object_name [lindex $cells 0]]"`,
            `set cells [get_cells -hier *]
puts "count=[llength $cells]"
puts "first=[get_object_name [lindex $cells 0]]"`,
            "直接运行；这里的数据库由课程内核稳定模拟。",
            "你完成了第一笔 EDA 对象查询。",
            {
              outputIncludes: ["count=7", "first=u_cpu"],
              traceCommands: ["get_cells"],
            },
          ),
          challenge(
            "collections-repair",
            "repair",
            "不要把整个集合当单个对象",
            "当前只读取第一个 cell。改为遍历，精确输出 7 行名字。",
            `set cells [get_cells -hier *]
set first [lindex $cells 0]
puts [get_object_name $first]`,
            `set cells [get_cells -hier *]
foreach cell $cells {
    puts [get_object_name $cell]
}`,
            "foreach cell $cells，然后对每个 $cell 调用 get_object_name。",
            "集合中的每个对象都被独立处理。",
            {
              outputIncludes: ["u_cpu", "u_dma/count_reg", "u_mem/valid_reg"],
              traceCommands: ["get_cells"],
            },
          ),
          challenge(
            "collections-create",
            "create",
            "先检查空集合",
            "查询 no_such_cell*；若集合为空，输出 no match。",
            `set cells [get_cells -quiet no_such_cell*]

# llength + if
`,
            `set cells [get_cells -quiet no_such_cell*]

if {[llength $cells] == 0} {
    puts "no match"
}`,
            "用 {[llength $cells] == 0} 判断。",
            "脚本不会再把“查不到”默默当成有效对象。",
            {
              outputExact: ["no match"],
              traceCommands: ["get_cells"],
            },
          ),
        ],
      ),
      lesson(
        "object-query",
        "22",
        "eda-objects",
        "把查询范围写准确",
        "模式、层次与 -quiet",
        "18 min",
        "用 glob 模式查找层次 cell，并理解 * 与具体路径的差异。",
        "查询模式作用于对象 NAME；层次设计中应明确是否递归，以及零匹配是否允许。",
        "宽泛 get_cells -hier * 在大设计里可能返回百万对象；先缩小对象类型和名字模式。",
        ["glob", "-hier", "-quiet", "查询规模"],
        [
          challenge(
            "object-query-predict",
            "predict",
            "glob 不是正则",
            "u_cpu/* 会匹配几个 cell？",
            `set cells [get_cells -hier {u_cpu/*}]
puts [llength $cells]`,
            `set cells [get_cells -hier {u_cpu/*}]
puts [llength $cells]`,
            "* 匹配任意字符；数据库里 u_cpu 下有 state_reg 和 data_lut。",
            "正确：模式匹配到两个层次对象。",
            undefined,
            {
              options: ["0", "1", "2", "7"],
              answer: 2,
            },
          ),
          challenge(
            "object-query-edit",
            "edit",
            "只查寄存器名字",
            "修改模式，让输出 count=4，只匹配以 _reg 结尾的层次 cell。",
            `set regs [get_cells -hier *]
puts "count=[llength $regs]"`,
            `set regs [get_cells -hier {*_reg}]
puts "count=[llength $regs]"`,
            "模式改为 {*_reg}。",
            "查询范围从所有 cell 缩到命名候选。",
            {
              outputExact: ["count=4"],
              traceCommands: ["get_cells"],
            },
          ),
          challenge(
            "object-query-create",
            "create",
            "组合多个名字模式",
            "一次查询 u_cpu 和 u_dma 两个顶层 cell，并输出 u_cpu u_dma。",
            `# get_cells 接受多个 pattern
`,
            `set blocks [get_cells u_cpu u_dma]
puts [get_object_name $blocks]`,
            "把两个 pattern 都放在 get_cells 后面。",
            "你用一次受控查询取得了多个明确目标。",
            {
              outputExact: ["u_cpu u_dma"],
              traceCommands: ["get_cells"],
            },
          ),
        ],
      ),
      lesson(
        "properties",
        "23",
        "eda-objects",
        "对象的事实藏在属性里",
        "get_property 与属性发现",
        "18 min",
        "读取 NAME、REF_NAME、LOC，并用 list_property 发现可用字段。",
        "对象句柄标识对象；属性描述对象。不要从名字字符串猜器件类型或状态。",
        "不同工具版本和对象类型的属性不同；先 list_property/report_property，再写自动化。",
        ["get_property", "list_property", "report_property"],
        [
          challenge(
            "properties-observe",
            "observe",
            "读取三个属性",
            "查询 state_reg 并输出它的名字、类型和位置。",
            `set cell [get_cells u_cpu/state_reg]
puts "name=[get_property NAME $cell]"
puts "type=[get_property REF_NAME $cell]"
puts "loc=[get_property LOC $cell]"`,
            `set cell [get_cells u_cpu/state_reg]
puts "name=[get_property NAME $cell]"
puts "type=[get_property REF_NAME $cell]"
puts "loc=[get_property LOC $cell]"`,
            "直接运行。",
            "句柄被连续用于三个属性查询。",
            {
              outputIncludes: [
                "name=u_cpu/state_reg",
                "type=FDRE",
                "loc=SLICE_X18Y43",
              ],
              traceCommands: ["get_cells", "get_property"],
            },
          ),
          challenge(
            "properties-repair",
            "repair",
            "不要从名字猜类型",
            "当前把名字当作类型。修复后输出 ref=FDRE。",
            `set cell [get_cells u_dma/count_reg]
puts "ref=[get_object_name $cell]"`,
            `set cell [get_cells u_dma/count_reg]
puts "ref=[get_property REF_NAME $cell]"`,
            "用 get_property REF_NAME $cell。",
            "类型来自结构化属性，不再来自命名约定。",
            {
              outputExact: ["ref=FDRE"],
              traceCommands: ["get_cells", "get_property"],
            },
          ),
          challenge(
            "properties-create",
            "create",
            "先发现，再读取",
            "检查 u_cpu/data_lut 的属性列表是否包含 REF_NAME；包含则输出 has_ref=1。",
            `set cell [get_cells u_cpu/data_lut]
set properties [list_property $cell]

# lsearch -exact
`,
            `set cell [get_cells u_cpu/data_lut]
set properties [list_property $cell]

puts "has_ref=[expr {[lsearch -exact $properties REF_NAME] >= 0}]"`,
            "lsearch -exact 返回索引，找不到返回 -1。",
            "你的脚本开始具备跨对象类型的防御性。",
            {
              outputExact: ["has_ref=1"],
              traceCommands: ["get_cells"],
            },
          ),
        ],
      ),
      lesson(
        "filters",
        "24",
        "eda-objects",
        "让数据库先替你筛",
        "-filter 与 filter",
        "20 min",
        "只取时序 cell、无输出延迟端口和负 slack 路径。",
        "优先在 get_* 的 -filter 中缩小集合；filter 则对已有集合二次筛选。",
        "把百万对象全拉回 Tcl 再 foreach 判断，通常比让工具数据库过滤更慢、更占内存。",
        ["-filter", "=~", "&&", "数据库侧过滤"],
        [
          challenge(
            "filters-observe",
            "observe",
            "只查询时序 cell",
            "运行并查看 4 个结果。注意筛选发生在 get_cells 内。",
            `set regs [get_cells -hier -filter {IS_SEQUENTIAL == 1}]
puts "count=[llength $regs]"
puts [get_object_name $regs]`,
            `set regs [get_cells -hier -filter {IS_SEQUENTIAL == 1}]
puts "count=[llength $regs]"
puts [get_object_name $regs]`,
            "直接运行。",
            "数据库只返回满足属性条件的对象。",
            {
              outputIncludes: ["count=4", "u_cpu/state_reg"],
              traceCommands: ["get_cells"],
            },
          ),
          challenge(
            "filters-repair",
            "repair",
            "组合两个端口条件",
            "只找 OUT 且没有输出延迟的端口，输出 out_valid irq。",
            `set ports [get_ports -filter {DIRECTION == OUT}]
puts [get_object_name $ports]`,
            `set ports [get_ports -filter {
    DIRECTION == OUT && HAS_OUTPUT_DELAY == 0
}]
puts [get_object_name $ports]`,
            "用 && 加上 HAS_OUTPUT_DELAY == 0。",
            "两个约束条件已经在对象查询阶段完成。",
            {
              outputExact: ["out_valid irq"],
              traceCommands: ["get_ports"],
            },
          ),
          challenge(
            "filters-create",
            "create",
            "筛选负 slack",
            "从 timing paths 中筛出 SLACK < 0，输出 count=2。",
            `set paths [get_timing_paths -max_paths 10]

# 使用 filter
`,
            `set paths [get_timing_paths -max_paths 10]
set failing [filter $paths {SLACK < 0}]
puts "count=[llength $failing]"`,
            "filter $paths {SLACK < 0}。",
            "违例集合现在可以继续被报告或排序。",
            {
              outputExact: ["count=2"],
              traceCommands: ["get_timing_paths", "filter"],
            },
          ),
        ],
      ),
      lesson(
        "relationships",
        "25",
        "eda-objects",
        "沿着 cell、pin、net 导航",
        "-of_objects 关系查询",
        "21 min",
        "从 cell 找 pins，再从 pin 找 net，建立对象图思维。",
        "-of_objects 用一个集合限定另一个对象类型；保持句柄直到导航结束。",
        "时序和连通性问题往往不在单个对象属性里，而在 cell→pin→net→pin 的关系链上。",
        ["-of_objects", "cell→pin", "pin→net", "对象图"],
        [
          challenge(
            "relationships-observe",
            "observe",
            "从 cell 找 pins",
            "查询 state_reg 的两个 pin。",
            `set cell [get_cells u_cpu/state_reg]
set pins [get_pins -of_objects $cell]
puts [get_object_name $pins]`,
            `set cell [get_cells u_cpu/state_reg]
set pins [get_pins -of_objects $cell]
puts [get_object_name $pins]`,
            "直接运行；右侧对象图会显示两次查询。",
            "你完成了第一次跨对象类型导航。",
            {
              outputExact: ["u_cpu/state_reg/D u_cpu/state_reg/Q"],
              traceCommands: ["get_cells", "get_pins"],
            },
          ),
          challenge(
            "relationships-edit",
            "edit",
            "从输出 pin 找 net",
            "把 Q pin 交给 get_nets -of_objects，输出 state_q。",
            `set pin [get_pins u_cpu/state_reg/Q]
set net [get_nets]
puts [get_object_name $net]`,
            `set pin [get_pins u_cpu/state_reg/Q]
set net [get_nets -of_objects $pin]
puts [get_object_name $net]`,
            "给 get_nets 加 -of_objects $pin。",
            "查询沿 Q pin 精确落到了相连 net。",
            {
              outputExact: ["state_q"],
              traceCommands: ["get_pins", "get_nets"],
            },
          ),
          challenge(
            "relationships-create",
            "create",
            "完成 cell→pin→net",
            "从 u_dma/count_reg 出发，经 Q pin 找到 data_bus。",
            `set cell [get_cells u_dma/count_reg]
# get_pins，再选 Q，再 get_nets
`,
            `set cell [get_cells u_dma/count_reg]
set pins [get_pins -of_objects $cell]
set qpin [filter $pins {DIRECTION == OUT}]
set net [get_nets -of_objects $qpin]
puts [get_object_name $net]`,
            "先查 pins，用 DIRECTION == OUT 选 Q，再查 net。",
            "你已经开始用对象关系表达连通性问题。",
            {
              outputExact: ["data_bus"],
              traceCommands: ["get_cells", "get_pins", "filter", "get_nets"],
            },
          ),
        ],
      ),
      lesson(
        "timing-paths",
        "26",
        "eda-objects",
        "把最差路径变成可读报告",
        "timing path 属性",
        "22 min",
        "查询负 slack 路径，提取端点、逻辑级数和延迟。",
        "timing path 本身是对象；STARTPOINT_PIN、ENDPOINT_PIN、SLACK 等属性比文本报告更适合自动化。",
        "先用结构化对象做判断，再把少量结果格式化给人看；不要反过来解析完整报告。",
        ["get_timing_paths", "SLACK", "STARTPOINT_PIN", "排序"],
        [
          challenge(
            "timing-paths-observe",
            "observe",
            "工具侧限定负 slack",
            "运行并输出两条失败路径的 slack。",
            `set paths [get_timing_paths -slack_lesser_than 0]
foreach path $paths {
    puts [get_property SLACK $path]
}`,
            `set paths [get_timing_paths -slack_lesser_than 0]
foreach path $paths {
    puts [get_property SLACK $path]
}`,
            "直接运行。",
            "失败路径已作为对象集合返回。",
            {
              outputExact: ["-0.230", "-0.050"],
              traceCommands: ["get_timing_paths", "get_property"],
            },
          ),
          challenge(
            "timing-paths-repair",
            "repair",
            "读终点，不要重复起点",
            "修复第二个属性名，输出 cpu/state_reg/Q -> mem/valid_reg/D。",
            `set path [lindex [get_timing_paths] 0]
set from [get_property STARTPOINT_PIN $path]
set to   [get_property STARTPOINT_PIN $path]
puts "$from -> $to"`,
            `set path [lindex [get_timing_paths] 0]
set from [get_property STARTPOINT_PIN $path]
set to   [get_property ENDPOINT_PIN $path]
puts "$from -> $to"`,
            "第二次 get_property 应读取 ENDPOINT_PIN。",
            "路径的两端现在被正确区分。",
            {
              outputExact: ["u_cpu/state_reg/Q -> u_mem/valid_reg/D"],
              traceCommands: ["get_timing_paths", "get_property"],
            },
          ),
          challenge(
            "timing-paths-create",
            "create",
            "生成一行 QoR 摘要",
            "对最差路径输出 WNS=-0.23 levels=8 delay=7.91。",
            `set worst [lindex [get_timing_paths] 0]

# 读取三个属性并用 format 输出
`,
            `set worst [lindex [get_timing_paths] 0]

set slack [get_property SLACK $worst]
set levels [get_property LOGIC_LEVELS $worst]
set delay [get_property DATAPATH_DELAY $worst]
puts [format "WNS=%.2f levels=%d delay=%.2f" $slack $levels $delay]`,
            "分别读取 SLACK、LOGIC_LEVELS、DATAPATH_DELAY。",
            "结构化对象已经变成稳定、简洁的人类报告。",
            {
              outputExact: ["WNS=-0.23 levels=8 delay=7.91"],
              traceCommands: ["get_timing_paths", "get_property"],
            },
          ),
        ],
      ),
    ],
  },
  {
    id: "vivado-flow",
    index: "05",
    title: "自动化一条 Vivado 流程",
    shortTitle: "流程",
    description: "把 Tcl 语言能力放回 project、non-project、报告、检查点和 batch 场景。",
    outcome: "能读懂并改造一条从 RTL 到 bitstream 的 Vivado 风格自动化流程。",
    lessons: [
      lesson(
        "project-mode",
        "27",
        "vivado-flow",
        "用 Tcl 驱动 Project Mode",
        "创建项目与 runs",
        "20 min",
        "创建项目、添加源文件、启动综合并等待完成。",
        "Project Mode 让 runs 管理状态；脚本负责创建输入、配置 run 并显式等待。",
        "课程模拟命令保持关键语义和状态，但不替代真实 Vivado；落地时要在目标版本上核对 help。",
        ["create_project", "add_files", "launch_runs", "wait_on_run"],
        [
          challenge(
            "project-mode-observe",
            "observe",
            "看一条项目流程",
            "运行模拟流程并观察四个命令事件。",
            `create_project demo ./demo -part xc7a200tfbg484-2 -force
add_files [list rtl/top.v rtl/core.v]
launch_runs synth_1 -jobs 8
wait_on_run synth_1
puts "project=[current_project]"`,
            `create_project demo ./demo -part xc7a200tfbg484-2 -force
add_files [list rtl/top.v rtl/core.v]
launch_runs synth_1 -jobs 8
wait_on_run synth_1
puts "project=[current_project]"`,
            "直接运行；设计数据库会切换到流程事件视图。",
            "Project Mode 的控制链已经串起来。",
            {
              outputExact: ["project=demo"],
              traceCommands: [
                "create_project",
                "add_files",
                "launch_runs",
                "wait_on_run",
              ],
            },
          ),
          challenge(
            "project-mode-repair",
            "repair",
            "等待正确的 run",
            "综合启动的是 synth_1；修复等待目标并输出 done=synth_1。",
            `create_project demo ./demo -part xc7a200t -force
launch_runs synth_1 -jobs 4
set run impl_1
wait_on_run $run
puts "done=$run"`,
            `create_project demo ./demo -part xc7a200t -force
launch_runs synth_1 -jobs 4
set run synth_1
wait_on_run $run
puts "done=$run"`,
            "把 run 变量改为 synth_1。",
            "启动和等待现在引用同一 run。",
            {
              outputExact: ["done=synth_1"],
              traceCommands: ["create_project", "launch_runs", "wait_on_run"],
            },
          ),
          challenge(
            "project-mode-create",
            "create",
            "参数化并行度",
            "设置 jobs=8，并让 launch_runs 使用变量；最后输出 jobs=8。",
            `set jobs 1
create_project demo ./demo -part xc7a200t -force

# launch_runs

puts "jobs=$jobs"`,
            `set jobs 8
create_project demo ./demo -part xc7a200t -force

launch_runs synth_1 -jobs $jobs

puts "jobs=$jobs"`,
            "先改 jobs，再写 launch_runs synth_1 -jobs $jobs。",
            "并行度已经从硬编码变成批处理参数。",
            {
              outputExact: ["jobs=8"],
              traceCommands: ["create_project", "launch_runs"],
            },
          ),
        ],
      ),
      lesson(
        "non-project",
        "28",
        "vivado-flow",
        "每一步都在你手里",
        "Non-Project Mode",
        "22 min",
        "依次读取 RTL/XDC，综合、优化、布局、布线。",
        "Non-Project Mode 没有 run manager 替你维护阶段；命令顺序和中间产物都由脚本负责。",
        "这种模式适合可复现、可组合的高级流程，但必须自己处理失败、报告和检查点。",
        ["read_verilog", "read_xdc", "synth_design", "route_design"],
        [
          challenge(
            "non-project-observe",
            "observe",
            "完整命令链",
            "运行一个最小 non-project 流程。",
            `read_verilog rtl/top.v
read_xdc constraints/top.xdc
synth_design -top top -part xc7a200t
opt_design
place_design
route_design
puts "design=[current_design]"`,
            `read_verilog rtl/top.v
read_xdc constraints/top.xdc
synth_design -top top -part xc7a200t
opt_design
place_design
route_design
puts "design=[current_design]"`,
            "直接运行。",
            "从输入到 routed design 的状态链已经完整。",
            {
              outputExact: ["design=top"],
              traceCommands: [
                "read_verilog",
                "read_xdc",
                "synth_design",
                "opt_design",
                "place_design",
                "route_design",
              ],
            },
          ),
          challenge(
            "non-project-repair",
            "repair",
            "修复阶段顺序",
            "布局必须早于布线。交换两行，让流程完成并输出 routed。",
            `read_verilog rtl/top.v
synth_design -top top
opt_design
route_design
place_design
puts routed`,
            `read_verilog rtl/top.v
synth_design -top top
opt_design
place_design
route_design
puts routed`,
            "把 place_design 放到 route_design 前。",
            "流程顺序与设计状态重新一致。",
            {
              outputExact: ["routed"],
              traceCommands: ["place_design", "route_design"],
            },
          ),
          challenge(
            "non-project-create",
            "create",
            "阶段后写检查点",
            "综合后写 synth.dcp，布线后写 route.dcp，最后输出 checkpoints=2。",
            `read_verilog rtl/top.v
synth_design -top top

# synth checkpoint

opt_design
place_design
route_design

# route checkpoint

puts "checkpoints=2"`,
            `read_verilog rtl/top.v
synth_design -top top
write_checkpoint -force synth.dcp

opt_design
place_design
route_design
write_checkpoint -force route.dcp

puts "checkpoints=2"`,
            "两处都使用 write_checkpoint -force 文件名。",
            "长流程获得了两个可恢复边界。",
            {
              outputExact: ["checkpoints=2"],
              traceCommands: ["write_checkpoint", "route_design"],
            },
          ),
        ],
      ),
      lesson(
        "reports",
        "29",
        "vivado-flow",
        "不要只生成报告，要判读报告",
        "Timing 与 Utilization",
        "22 min",
        "获取报告文本，同时用对象 API 生成可机读摘要。",
        "report_* 适合人读；get_timing_paths/get_property 适合机器决策，两者各司其职。",
        "CI 最需要的是小而稳定的 PASS/FAIL 指标，完整报告则作为诊断附件保留。",
        ["report_timing_summary", "report_utilization", "结构化摘要"],
        [
          challenge(
            "reports-observe",
            "observe",
            "生成两类报告",
            "运行并输出模拟的 timing 与 utilization 报告。",
            `synth_design -top top
place_design
route_design

puts [report_timing_summary]
puts "---"
puts [report_utilization]`,
            `synth_design -top top
place_design
route_design

puts [report_timing_summary]
puts "---"
puts [report_utilization]`,
            "直接运行。",
            "人类报告已经生成，流程事件也被记录。",
            {
              outputIncludes: ["WNS -0.230 ns", "LUT 42.1%"],
              traceCommands: [
                "report_timing_summary",
                "report_utilization",
              ],
            },
          ),
          challenge(
            "reports-repair",
            "repair",
            "让 CI 看懂结果",
            "当前只打印 WNS。补上判断，让最后一行是 status=FAIL。",
            `set worst [lindex [get_timing_paths] 0]
set wns [get_property SLACK $worst]
puts "wns=$wns"

# if 输出 status`,
            `set worst [lindex [get_timing_paths] 0]
set wns [get_property SLACK $worst]
puts "wns=$wns"

if {$wns < 0} {
    puts "status=FAIL"
} else {
    puts "status=PASS"
}`,
            "以 {$wns < 0} 为条件输出 FAIL，否则 PASS。",
            "报告文本已经升级为可供 CI 判断的状态。",
            {
              outputIncludes: ["wns=-0.230", "status=FAIL"],
              traceCommands: ["get_timing_paths", "get_property"],
            },
          ),
          challenge(
            "reports-create",
            "create",
            "生成 JSON 风格摘要",
            "精确输出 {\"wns\":-0.230,\"failing\":2}。",
            `set paths [get_timing_paths]
set failing [filter $paths {SLACK < 0}]
set wns [get_property SLACK [lindex $paths 0]]

# format；用花括号保护 JSON 模板
`,
            `set paths [get_timing_paths]
set failing [filter $paths {SLACK < 0}]
set wns [get_property SLACK [lindex $paths 0]]

puts [format {{"wns":%.3f,"failing":%d}} $wns [llength $failing]]`,
            "format 模板写成 {{{\"wns\":%.3f,\"failing\":%d}}} 的 Tcl 形式：外层花括号保护字面量。",
            "CI 获得了稳定、可解析的一行摘要。",
            {
              outputExact: ['{"wns":-0.230,"failing":2}'],
              traceCommands: ["get_timing_paths", "filter", "get_property"],
            },
          ),
        ],
      ),
      lesson(
        "batch",
        "30",
        "vivado-flow",
        "让脚本真正适合无人值守",
        "Batch 入口与退出契约",
        "23 min",
        "组合参数校验、阶段日志、catch 和最终状态。",
        "批处理入口要验证参数、输出阶段标记、在失败时返回非零，并始终留下可诊断信息。",
        "命令行外壳通常是 vivado -mode batch -source build.tcl -tclargs ...；Tcl 脚本本身仍应可单元测试。",
        ["-mode batch", "-tclargs", "阶段日志", "退出码"],
        [
          challenge(
            "batch-predict",
            "predict",
            "阶段标记比散乱日志更可靠",
            "判断输出顺序。",
            `foreach stage {READ SYNTH PLACE ROUTE} {
    puts "DOJO_STAGE=$stage"
}`,
            `foreach stage {READ SYNTH PLACE ROUTE} {
    puts "DOJO_STAGE=$stage"
}`,
            "foreach 保留列表顺序。",
            "正确：CI 可以稳定定位失败阶段。",
            undefined,
            {
              options: [
                "READ/SYNTH/PLACE/ROUTE",
                "ROUTE/PLACE/SYNTH/READ",
                "只输出 READ",
                "随机顺序",
              ],
              answer: 0,
            },
          ),
          challenge(
            "batch-repair",
            "repair",
            "保留失败阶段",
            "让 catch 后输出 FAILED@synth: synthesis failed。",
            `set stage synth
set status [catch {
    error "synthesis failed"
} message]

if {$status} {
    puts "FAILED: $message"
}`,
            `set stage synth
set status [catch {
    error "synthesis failed"
} message]

if {$status} {
    puts "FAILED@$stage: $message"
}`,
            "在 FAILED 后插入 @$stage。",
            "错误现在同时回答了“哪里”和“为什么”。",
            { outputExact: ["FAILED@synth: synthesis failed"] },
          ),
          challenge(
            "batch-create",
            "create",
            "写一个最小 batch 入口",
            "argv 是 -top soc_top；解析并输出 BUILD top=soc_top version=2025.1-dojo。",
            `set argv {-top soc_top}

# 读取索引 1；调用 version -short
`,
            `set argv {-top soc_top}

set top [lindex $argv 1]
puts "BUILD top=$top version=[version -short]"`,
            "top 是 [lindex $argv 1]；版本来自 [version -short]。",
            "脚本入口已经能记录关键复现信息。",
            { outputExact: ["BUILD top=soc_top version=2025.1-dojo"] },
          ),
        ],
      ),
    ],
  },
  {
    id: "capstones",
    index: "06",
    title: "把知识变成四个可交付脚本",
    shortTitle: "实战",
    description: "不再给出逐行 TODO。完成约束审计、时序分诊、QoR 摘要和全流程门禁。",
    outcome: "带走四个可迁移到真实项目的 Tcl 脚本骨架。",
    lessons: [
      lesson(
        "constraint-audit",
        "31",
        "capstones",
        "找出漏加输出延迟的端口",
        "Capstone · 约束审计",
        "28 min",
        "查询所有输出端口，筛出 HAS_OUTPUT_DELAY==0，并生成审计结论。",
        "审计脚本要同时报告对象明细、缺失数量和最终状态。",
        "真实 Vivado 中属性名和约束覆盖查询要按版本确认；这里训练的是稳定的审计结构。",
        ["get_ports", "filter", "审计结论"],
        [
          challenge(
            "constraint-audit-build",
            "capstone",
            "完成约束审计器",
            "输出每个漏约束端口的 MISSING 行，最后输出 AUDIT=FAIL missing=2。",
            `set outputs [get_ports -filter {DIRECTION == OUT}]

# 1. 筛选 HAS_OUTPUT_DELAY == 0
# 2. foreach 输出 "MISSING <name>"
# 3. 输出最终 AUDIT 状态和数量
`,
            `set outputs [get_ports -filter {DIRECTION == OUT}]
set missing [filter $outputs {HAS_OUTPUT_DELAY == 0}]

foreach port $missing {
    puts "MISSING [get_object_name $port]"
}

set count [llength $missing]
set status [expr {$count > 0 ? "FAIL" : "PASS"}]
puts "AUDIT=$status missing=$count"`,
            "先 filter，再 foreach；状态可以用 expr 的三元表达式得到。",
            "约束审计器完成：对象证据和机器结论同时存在。",
            {
              outputIncludes: [
                "MISSING out_valid",
                "MISSING irq",
                "AUDIT=FAIL missing=2",
              ],
              traceCommands: ["get_ports", "filter"],
            },
          ),
          challenge(
            "constraint-audit-refactor",
            "create",
            "提取可复用审计过程",
            "定义 audit_outputs {}，返回缺失端口数量；调用后输出 missing=2。",
            `# 定义 audit_outputs

puts "missing=[audit_outputs]"`,
            `proc audit_outputs {} {
    set outputs [get_ports -filter {DIRECTION == OUT}]
    set missing [filter $outputs {HAS_OUTPUT_DELAY == 0}]
    foreach port $missing {
        puts "MISSING [get_object_name $port]"
    }
    return [llength $missing]
}

puts "missing=[audit_outputs]"`,
            "把查询、筛选、明细输出放进 proc，最后 return 数量。",
            "审计规则已经成为可被更大流程调用的组件。",
            {
              outputIncludes: ["MISSING out_valid", "missing=2"],
              traceCommands: ["get_ports", "filter"],
            },
          ),
        ],
      ),
      lesson(
        "timing-triage",
        "32",
        "capstones",
        "按严重度分诊失败路径",
        "Capstone · Timing triage",
        "30 min",
        "把负 slack 路径分为 CRITICAL 与 MINOR，并输出端点、slack、逻辑级数。",
        "分诊不是只看最差值；要输出足够上下文，让工程师知道先看哪条、为什么。",
        "生产版本还可加入 clock group、physical distance、congestion 和 exception 覆盖信息。",
        ["timing path", "分类", "格式化"],
        [
          challenge(
            "timing-triage-build",
            "capstone",
            "完成时序分诊器",
            "阈值 -0.10；两条失败路径分别输出 CRITICAL 和 MINOR，最后 total=2。",
            `set threshold -0.10
set paths [get_timing_paths -slack_lesser_than 0]

# foreach：
# 读取 SLACK、STARTPOINT_PIN、ENDPOINT_PIN、LOGIC_LEVELS
# slack < threshold => CRITICAL，否则 MINOR
# 格式："LEVEL from -> to slack=-0.230 levels=8"

puts "total=[llength $paths]"`,
            `set threshold -0.10
set paths [get_timing_paths -slack_lesser_than 0]

foreach path $paths {
    set slack [get_property SLACK $path]
    set from [get_property STARTPOINT_PIN $path]
    set to [get_property ENDPOINT_PIN $path]
    set levels [get_property LOGIC_LEVELS $path]
    set severity [expr {$slack < $threshold ? "CRITICAL" : "MINOR"}]
    puts [format "%s %s -> %s slack=%.3f levels=%d" \
        $severity $from $to $slack $levels]
}

puts "total=[llength $paths]"`,
            "先取属性，再用三元表达式得到 severity；format 保证小数位。",
            "时序分诊器已经给出了清晰优先级。",
            {
              outputIncludes: [
                "CRITICAL u_cpu/state_reg/Q -> u_mem/valid_reg/D slack=-0.230 levels=8",
                "MINOR u_uart/rx_reg/Q -> u_cpu/state_reg/D slack=-0.050 levels=7",
                "total=2",
              ],
              traceCommands: ["get_timing_paths", "get_property"],
            },
          ),
          challenge(
            "timing-triage-summary",
            "create",
            "增加机器摘要",
            "输出 TRIAGE=FAIL critical=1 minor=1。",
            `set threshold -0.10
set paths [get_timing_paths -slack_lesser_than 0]
set critical 0
set minor 0

# 计数并输出摘要
`,
            `set threshold -0.10
set paths [get_timing_paths -slack_lesser_than 0]
set critical 0
set minor 0

foreach path $paths {
    set slack [get_property SLACK $path]
    if {$slack < $threshold} {
        incr critical
    } else {
        incr minor
    }
}

set status [expr {[llength $paths] > 0 ? "FAIL" : "PASS"}]
puts "TRIAGE=$status critical=$critical minor=$minor"`,
            "循环内分别 incr；总路径数大于 0 就是 FAIL。",
            "人类分诊和 CI 摘要现在可以共享同一批对象。",
            {
              outputExact: ["TRIAGE=FAIL critical=1 minor=1"],
              traceCommands: ["get_timing_paths", "get_property"],
            },
          ),
        ],
      ),
      lesson(
        "qor-library",
        "33",
        "capstones",
        "把 QoR 报告做成小型库",
        "Capstone · 可复用模块",
        "32 min",
        "在 ::qor 命名空间中提供 summary 命令，返回结构化 dict。",
        "库函数返回数据，调用方决定打印、写文件还是上传 CI；这是复用边界。",
        "把工具 API 封装在少量 adapter 过程里，未来适配 Quartus 或其他版本时改动更集中。",
        ["namespace", "dict return", "API 边界"],
        [
          challenge(
            "qor-library-build",
            "capstone",
            "实现 ::qor::summary",
            "返回含 wns、failing、status 的 dict，并输出 WNS=-0.230 failing=2 status=FAIL。",
            `namespace eval ::qor {
    proc summary {} {
        # 查询 paths
        # 构造并 return dict
    }
}

set summary [::qor::summary]
puts "WNS=[dict get $summary wns] failing=[dict get $summary failing] status=[dict get $summary status]"`,
            `namespace eval ::qor {
    proc summary {} {
        set paths [get_timing_paths]
        set failing [filter $paths {SLACK < 0}]
        set wns [get_property SLACK [lindex $paths 0]]
        set status [expr {[llength $failing] ? "FAIL" : "PASS"}]
        return [dict create \
            wns $wns \
            failing [llength $failing] \
            status $status]
    }
}

set summary [::qor::summary]
puts "WNS=[dict get $summary wns] failing=[dict get $summary failing] status=[dict get $summary status]"`,
            "summary 内先查询，再 return [dict create ...]。",
            "QoR 数据已经与展示方式解耦。",
            {
              outputExact: ["WNS=-0.230 failing=2 status=FAIL"],
              traceCommands: ["get_timing_paths", "filter", "get_property"],
            },
          ),
          challenge(
            "qor-library-render",
            "create",
            "增加 CSV 渲染器",
            "定义 ::qor::to_csv {summary}，输出 -0.230,2,FAIL。",
            `namespace eval ::qor {
    proc to_csv {summary} {
        # 从 dict 依次取 wns/failing/status
    }
}

set data [dict create wns -0.230 failing 2 status FAIL]
puts [::qor::to_csv $data]`,
            `namespace eval ::qor {
    proc to_csv {summary} {
        set row [list \
            [dict get $summary wns] \
            [dict get $summary failing] \
            [dict get $summary status]]
        return [join $row ,]
    }
}

set data [dict create wns -0.230 failing 2 status FAIL]
puts [::qor::to_csv $data]`,
            "先按固定顺序构造 row 列表，再 join $row ,。",
            "同一份结构化数据已经能渲染成机器格式。",
            { outputExact: ["-0.230,2,FAIL"] },
          ),
        ],
      ),
      lesson(
        "full-flow-gate",
        "34",
        "capstones",
        "从 RTL 到门禁结论",
        "Final · 完整自动化",
        "38 min",
        "运行 non-project 流程、写检查点、生成报告，并以 timing 结果决定 PASS/FAIL。",
        "完整脚本要把配置、阶段、产物、指标和最终结论串成一条可复现证据链。",
        "你现在掌握的不是“会几条 Tcl 命令”，而是把工具动作变成可靠工程系统的方法。",
        ["完整 flow", "checkpoint", "QoR gate", "可复现性"],
        [
          challenge(
            "full-flow-build",
            "capstone",
            "完成最终构建脚本",
            "补全 PLACE/ROUTE、检查点、报告和 timing gate；最终输出 BUILD=FAIL WNS=-0.230。",
            `set config [dict create \
    top top \
    part xc7a200t \
    rtl rtl/top.v \
    xdc constraints/top.xdc \
    out /tmp/build]

file mkdir [dict get $config out]
puts "STAGE=READ"
read_verilog [dict get $config rtl]
read_xdc [dict get $config xdc]

puts "STAGE=SYNTH"
synth_design -top [dict get $config top] -part [dict get $config part]
write_checkpoint -force [file join [dict get $config out] synth.dcp]

# TODO: STAGE=PLACE + place_design
# TODO: STAGE=ROUTE + route_design + route checkpoint
# TODO: 生成 timing summary
# TODO: 读取最差 WNS，并输出 BUILD=PASS/FAIL
`,
            `set config [dict create \
    top top \
    part xc7a200t \
    rtl rtl/top.v \
    xdc constraints/top.xdc \
    out /tmp/build]

file mkdir [dict get $config out]
puts "STAGE=READ"
read_verilog [dict get $config rtl]
read_xdc [dict get $config xdc]

puts "STAGE=SYNTH"
synth_design -top [dict get $config top] -part [dict get $config part]
write_checkpoint -force [file join [dict get $config out] synth.dcp]

puts "STAGE=PLACE"
place_design

puts "STAGE=ROUTE"
route_design
write_checkpoint -force [file join [dict get $config out] route.dcp]
report_timing_summary

set worst [lindex [get_timing_paths] 0]
set wns [get_property SLACK $worst]
set status [expr {$wns < 0 ? "FAIL" : "PASS"}]
puts "BUILD=$status WNS=$wns"`,
            "按 TODO 顺序补齐；最后从 timing path 对象读取 SLACK，而不是解析报告文本。",
            "最终构建脚本完成。你已经能把 Tcl 用在真正值得用它的地方。",
            {
              outputIncludes: [
                "STAGE=READ",
                "STAGE=SYNTH",
                "STAGE=PLACE",
                "STAGE=ROUTE",
                "BUILD=FAIL WNS=-0.230",
              ],
              traceCommands: [
                "read_verilog",
                "read_xdc",
                "synth_design",
                "write_checkpoint",
                "place_design",
                "route_design",
                "report_timing_summary",
                "get_timing_paths",
                "get_property",
              ],
            },
          ),
          challenge(
            "full-flow-reflect",
            "create",
            "给流程加最后一道防线",
            "定义 require_nonempty {label objects}；空集合时抛错 empty: <label>，非空时返回数量。输出 cells=7。",
            `proc require_nonempty {label objects} {
    # 检查并返回数量
}

set cells [get_cells -hier *]
puts "cells=[require_nonempty cells $cells]"`,
            `proc require_nonempty {label objects} {
    set count [llength $objects]
    if {$count == 0} {
        error "empty: $label"
    }
    return $count
}

set cells [get_cells -hier *]
puts "cells=[require_nonempty cells $cells]"`,
            "先计算 count；等于 0 就 error，否则 return。",
            "你补上了可复用于每个关键查询的防御式断言。",
            {
              outputExact: ["cells=7"],
              traceCommands: ["get_cells"],
            },
          ),
        ],
      ),
    ],
  },
];

export const allLessons = courseModules.flatMap((module) => module.lessons);
export const allChallenges = allLessons.flatMap((item) => item.challenges);

export const courseStats = {
  modules: courseModules.length,
  lessons: allLessons.length,
  challenges: allChallenges.length,
  capstones: allChallenges.filter((item) => item.kind === "capstone").length,
};

export function findLesson(lessonId: string) {
  return allLessons.find((item) => item.id === lessonId) ?? allLessons[0];
}

export const commandReference = [
  ["set name value", "保存或读取变量"],
  ["puts ?channel? value", "输出到终端或文件"],
  ["expr {expression}", "执行数值/布尔计算"],
  ["list / lindex / llength", "构造与读取列表"],
  ["foreach item $items {…}", "遍历集合"],
  ["if {condition} {…}", "按规则分支"],
  ["dict get / dict set", "处理结构化键值"],
  ["proc name {args} {…}", "封装可复用过程"],
  ["catch {script} message", "捕获错误"],
  ["get_cells ?options? pattern", "查询设计 cell"],
  ["get_property PROP $object", "读取对象属性"],
  ["filter $objects {PROP < 0}", "二次筛选集合"],
  ["get_pins -of_objects $cell", "沿对象关系导航"],
  ["get_timing_paths", "查询时序路径对象"],
  ["report_timing_summary", "生成人类可读报告"],
] as const;
