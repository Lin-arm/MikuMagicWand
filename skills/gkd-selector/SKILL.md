---
name: gkd-selector
description: 'GKD（gkd-kit，官网 gkd.li）选择器与订阅规则编写技能：属性/关系选择器、逻辑组合、正则与转义、RawRule 字段、匹配与查询优化、常见误用与自检清单；支持从截图 + 节点树做视觉定位。触发词：GKD、GKD 选择器、gkd.li、订阅规则、rules、matches、开屏广告规则、快照审查、截图找节点、视觉映射、节点树。'
---

# GKD 选择器与规则编写

> **适用对象**：GKD（gkd-kit）—— Android 上的自动化点击工具，用无障碍节点选择器跳过开屏/弹窗广告。
> 官网 <https://gkd.li>，网页快照审查工具 <https://i.gkd.li>。
>
> **权威来源**（本技能为归纳，冲突时以官方为准）：
>
> - 选择器语法：<https://gkd.li/guide/selector>（源码 <https://github.com/gkd-kit/docs/blob/main/gkd-docs/guide/selector.md>）
> - 属性方法：<https://gkd.li/guide/node>；示例：<https://gkd.li/guide/example>；查询优化：<https://gkd.li/guide/optimize>
> - 规则字段：<https://gkd.li/api/>（类型来自 `@gkd-kit/api`，npm latest = 0.9.3）
> - 订阅格式：<https://gkd.li/guide/subscription>
>
> 文档快照日期：2026-10-19。

---

## 快速执行（先读这一节）

按输入选路径，**只读对应章节，不要通读全文再动手**。

| 输入                             | 路径                         | 步数预算 |
| -------------------------------- | ---------------------------- | -------- |
| 快照链接 + 目标节点/选择器       | §6.1 检验 → 输出             | 3        |
| 任务 + 截图 + 整棵节点树         | §6.2 定位 → 输出             | 5        |
| 只有文字描述（无快照、无节点树） | 索要快照链接或节点树，给模板 | 1–2      |

> 节点树用输入原样：`nodes` 数组、JSONL、嵌套 JSON 都直接读，不要先做格式转换。

**硬规则**

1. 只筛一轮候选；置信度中/低就并列候选，不猜、不反复重写。
2. 每个结论落到具体属性；属性不在节点里就不用。
3. 直接输出完整规则组 JSON5，不写过程性长文。
4. 自检只做 5 项：属性存在、方向正确、`matches` 是 AND、JSON 转义、界面限定。
5. 找不到匹配节点/看不到图 → 停止并报告，最多重试 1 次。

**输出契约**（按顺序，尽量短）

1. 目标：`#id` + 一句话理由；视觉流程附像素框 → 屏幕框。
2. 规则组 JSON5（完整 `RawAppGroup`）。
3. 备选选择器（仅当置信度不是高）。
4. 自检 5 项 ✅/❌。

> 需要语法细节时才查 §2–§5；报错对照 §7；批量或发布前再用 §8 完整清单。

---

## 0. 先分清你在写哪一层

| 层级              | 是什么                                  | 关键字段                         |
| ----------------- | --------------------------------------- | -------------------------------- |
| 选择器            | 定位屏幕上某个节点的表达式，类 CSS      | `A > B`、`[text*='跳过']`        |
| 规则 rule         | “匹配什么 + 命中后做什么”               | `matches`、`action`、`matchTime` |
| 规则组 group      | 一组规则的容器，是启停单位              | `key`、`name`、`enable`、`rules` |
| 订阅 subscription | 一个 JSON5 文件，含 apps / globalGroups | `id`、`version`、`updateUrl`     |
| 快照              | 某时刻屏幕节点树的可视化，用于调试      | `https://i.gkd.li/i/<id>`        |

一句话：**选择器只是规则里的一个字段**；先能在快照里把节点选出来，再谈规则字段。

---

## 1. 心智模型（务必先建立）

1. **AST 结构**：`属性选择器 (关系选择器 属性选择器)*`，首尾都必须是属性选择器。
   `div > img` = `属性选择器 关系选择器 属性选择器`。
2. **空白强制**：属性选择器与关系选择器之间必须有空白字符；`div>img` **非法**，必须 `div > img`。
3. **从右往左匹配**：`FrameLayout > TextView` 是先找到 `TextView`，再验证其父节点是不是 `FrameLayout`；不是从左往右找儿子。写选择器时**把最具体的条件放在最右端**。
4. **关系方向**：`A > B` 表示 **A 是 B 的祖先**；`A < B` 表示 **A 是 B 的直接子节点**（与直觉相反，最常写错）。
5. **`@` 决定点哪个节点**：一条选择器里只有**最后一个属性选择器**的 `@` 生效；没有 `@` 就取最后一个属性选择器的节点。
6. **选择器最终住在 JSON 字符串里**：选择器自身的一层转义 + JSON 一层转义；正则表达式还要再加一层（见 §7）。

---

## 2. 属性选择器

### 2.1 形式

```text
@Tag[a=1][b^='2'][c*='a' || d.length>7 && e=false][!(f=true)][g.plus(1)>0]
```

- `@`：可选，标记“目标节点”，放在该属性选择器最前面。
- `Tag`：等价于 `[name='Tag' || name$='.Tag']`；`*` 表示任意节点。
- `[...]`：零个或多个，内部是逻辑/布尔/取反表达式；**并列的 `[]` 等价于 `&&`**（`[a=1][b=1]` = `[a=1 && b=1]`）。

### 2.2 `[]` 内的三类表达式

| 类型       | 示例                                     |
| ---------- | ---------------------------------------- |
| 布尔表达式 | `name='TextView'`                        |
| 逻辑表达式 | `name='TextView' \|\| name$='.TextView'` |
| 取反表达式 | `!(name$='TextView')`                    |

- 逻辑运算符只有 `||` 和 `&&`，**`&&` 优先级更高**：`[a>1 || b>1 && c>1 || d>1]` = `[a>1 || (b>1 && c>1) || d>1]`。
- `!` 后**必须**紧跟一个 `(...)`；`!!(...)` 非法。

### 2.3 值表达式

| 形式        | 示例                                       | 说明                                                            |
| ----------- | ------------------------------------------ | --------------------------------------------------------------- |
| 变量/标识符 | `a`                                        | 正则 `^[_a-zA-Z][a-zA-Z0-9_]*$`，且不能是 `null`/`true`/`false` |
| 成员表达式  | `a.b`、`a.b.c`                             | 属性名必须是合法标识符（`a.1`、`a.null` 非法）                  |
| 调用表达式  | `a(b,c)`、`a()`                            | 调用者不能再是调用（`a()()` 非法）                              |
| 字面量      | `null`、`true`/`false`、`114514`、`'ikun'` | 见下                                                            |

- **int**：十进制整数，不支持 `+1` 写法。
- **string**：单引号 `'`、反引号 `` ` ``、双引号 `"` 三种引号成对包裹；转义序列 `\\`、`\'`、`\"`、`` \` ``、`\n`、`\r`、`\t`、`\b`、`\xNN`、`\uNNNN`；不支持多行；`[0, 0x1F]` 控制字符必须转义。
- 类型分两类：基础类型（`null`/`boolean`/`int`/`string`）与对象类型（`context`、`node`）。

### 2.4 操作符

| 操作符            | 名称                                | 说明                                                            |
| ----------------- | ----------------------------------- | --------------------------------------------------------------- |
| `=` / `!=`        | equal / notEqual                    | 等于 / 不等于                                                   |
| `>` `>=` `<` `<=` | more / moreEqual / less / lessEqual | 仅 int                                                          |
| `^=` `!^=`        | startsWith / notStartsWith          | 仅 string                                                       |
| `*=` `!*=`        | contains / notContains              | 仅 string                                                       |
| `$=` `!$=`        | endsWith / notEndsWith              | 仅 string                                                       |
| `~=` `!~=`        | matches / notMatches                | 仅 string；右侧只能是字符串字面量，按当前平台的 Kotlin 正则校验 |

类型矩阵（✅ 合法，❌ 非法类型）：

| 操作符                                      | null | boolean | int | string |
| ------------------------------------------- | ---- | ------- | --- | ------ |
| `=` `!=`                                    | ✅   | ✅      | ✅  | ✅     |
| `>` `>=` `<` `<=`                           | ❌   | ❌      | ✅  | ❌     |
| `^=` `!^=` `*=` `!*=` `$=` `!$=` `~=` `!~=` | ❌   | ❌      | ❌  | ✅     |

**null 语义**：除 `=`/`!=` 外，只要操作数是 `null`，表达式一律为 `false`。
所以 `[text!='x']` 与 `[text!$='x']` 在 `text=null` 时结果不同；需要“不是以 x 结尾（含 null）”时写 `[text=null || !(text$='x')]`。

### 2.5 属性方法（常用）

| 类型      | 可用的属性 / 方法                                                                                                                                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `null`    | 无属性；链式调用遇 `null` 返回 `null`（如 `name.length` 为 null）                                                                                                                                                                                    |
| `boolean` | `toInt()`、`or(b)`、`and(b)`、`not()`、`ifElse(a,b)`                                                                                                                                                                                                 |
| `int`     | `toString([radix])`、`plus/minus/times/div/rem`（按文档标注返回 string）、`more/moreEqual/less/lessEqual`                                                                                                                                            |
| `string`  | `length`、`get(i)`、`at(负数从尾部取)`、`substring(i[, j])`、`toInt([radix])`、`indexOf(s[, start])`                                                                                                                                                 |
| `node`    | `id`、`vid`、`name`、`text`、`desc`、`clickable`、`focusable`、`checkable`、`checked`、`editable`、`longClickable`、`visibleToUser`、`left/top/right/bottom`、`width/height`、`childCount`、`index`、`depth`、`parent`、`getChild(i)`、`_id`、`_pid` |
| `context` | 继承 node，额外 `prev`（右侧属性选择器的节点，最右侧为 null）、`current`（当前节点）、`getPrev(i)`                                                                                                                                                   |
| `global`  | 继承 context，额外 `equal(a,b)`、`notEqual(a,b)`；任何裸标识符/调用都来自 global                                                                                                                                                                     |

> `_id` / `_pid` **只能在网页快照调试工具**使用，真机不可用 —— 规则里禁止依赖它们。

示例（来自官方文档）：

```text
FrameLayout[prev.name$='ImageView'] > ImageView[current.name=name]
[name=''][prev.name=''][current.name=''][parent.name='']
```

---

## 3. 关系选择器

### 3.1 关系操作符

| 操作符 | 含义                                 | 约束                                        |
| ------ | ------------------------------------ | ------------------------------------------- |
| `+`    | 前置兄弟节点                         | `A.index = B.index - a_m`                   |
| `-`    | 后置兄弟节点                         | `A.index = B.index + a_m`                   |
| `>`    | 祖先节点                             | `A.depth = B.depth - a_m`（根节点 depth=0） |
| `<`    | 直接子节点                           | `A.index = a_m - 1`                         |
| `<<`   | 子孙节点（深度先序 order）           | `A.order = a_m - 1`                         |
| `->`   | 查询过程中“之前（右侧）已查询的节点” | `N.index = B.index - a_m`                   |

### 3.2 关系表达式

| 形式   | 示例                      | 说明                                                                     |
| ------ | ------------------------- | ------------------------------------------------------------------------ |
| 元组   | `(1)`、`(2,3,5)`          | 常量、有序递增正整数                                                     |
| 多项式 | `(n)`、`(2n-1)`、`(-n+4)` | 集合 `{an+b \| an+b>=1, n>=1}`；`(-n+4)` = `(1,2,3)`；`(n)` = 全体正整数 |

**简写**（`+` 为例）：

```text
A +(3n+0) B  ->  A +(3n) B  ->  A +3n B
A +(0n+3) B  ->  A +(+3) B  ->  A +3 B
A +(0n+1) B  ->  A + B
A >(1n+0) B  ->  A >n B     ->  A B
```

`A + B`、`A > B` 与 CSS 同名语义一致。

`->` 的用途：在从右往左的查询里“回到”右侧已经匹配过的节点上继续写约束，例如 `C ->1 B > A`：匹配到 B 时，`C` 指 B 右侧最近的已查询节点（即 A）。

### 3.3 组合与优先级

- 组合时必须给单个选择器加 `()`：`(A + B) || (M > N)`。
- `||`：短路，左分支满足则结果为其末尾节点（或 `@` 指定的节点），否则取右分支结果。
- `&&`：两边都要满足，结果取右侧分支的节点。
- `!(A + B)`：节点不满足该选择器；内部 `@` **无效**，结果固定为末尾节点。
- 优先级：`&&` 高于 `||`。

常用范式（记住方向）：

```text
# 选 TextView，且父节点是 LinearLayout
LinearLayout > TextView

# 选 LinearLayout（目标在左，用 @），且其子节点是带 id/text 的 TextView
@LinearLayout > TextView[id='xxx'][text='不感兴趣']

# 选任意节点，且祖先里有 RecyclerView
[vid='recyclerView'] >n *

# 选根节点
[parent=null]
[depth=0]
```

---

## 4. 规则结构（RawRule）

订阅是 JSON5；`rules` 里可以直接写字符串或字符串数组作为 `matches` 的简写。

### 4.1 层级

```text
RawSubscription
├─ apps[]: RawApp{ id, name?, groups[] }
│   └─ RawAppGroup{ key, name, enable?, rules[] }
│       └─ RawAppRule{ key?, name?, matches, action?, ... }
├─ globalGroups[]: RawGlobalGroup{ key, name, rules[] }
│   └─ RawGlobalRule{ matches, matchAnyApp?, apps?, ... }
└─ categories[]: RawCategory{ key, name, enable? }
```

### 4.2 通用字段（规则/规则组都可用，`RawCommonProps`）

| 字段                                                   | 默认         | 作用                                                               |
| ------------------------------------------------------ | ------------ | ------------------------------------------------------------------ |
| `actionCd`                                             | 1000         | 动作冷却（毫秒），同一规则两次点击的最小间隔                       |
| `actionDelay`                                          | —            | 查到节点后等一段时间再查一次，仍命中才执行                         |
| `fastQuery`                                            | false        | 对符合格式的选择器启用快速查找（见 §5）                            |
| `matchRoot`                                            | false        | 每次从根节点开始匹配，而非从无障碍事件节点开始                     |
| `matchDelay`                                           | —            | 规则被唤醒后延迟参与匹配                                           |
| `matchTime`                                            | —            | 参与匹配的总时长，超时休眠该规则                                   |
| `actionMaximum`                                        | —            | 动作最多执行次数，达到后休眠                                       |
| `resetMatch`                                           | `'activity'` | 何时重置 `matchTime`/`actionMaximum`：`activity` / `match` / `app` |
| `actionCdKey`                                          | —            | 与指定 key 的规则共享冷却                                          |
| `actionMaximumKey`                                     | —            | 与指定 key 的规则共享执行次数                                      |
| `order`                                                | 0            | 匹配顺序，数字越小越先                                             |
| `forcedTime`                                           | —            | 开头一段时间内主动轮询屏幕（应对 flutter/webview 不触发事件）      |
| `priorityTime`                                         | —            | 优先级时间，期间本规则优先匹配                                     |
| `priorityActionMaximum`                                | 1            | 优先级执行多少次后降为普通规则                                     |
| `snapshotUrls` / `excludeSnapshotUrls` / `exampleUrls` | —            | 快照/反例快照/运行示例，便于维护                                   |

### 4.3 规则专有字段（`RawRuleProps`）

| 字段                | 说明                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `key`               | 规则在组内唯一标识；创建后不要改，否则点击记录错乱                                                                            |
| `name`              | 规则名                                                                                                                        |
| `preKeys`           | 要求同组某 key 规则刚执行过，才允许本规则执行（防误触、强制顺序）                                                             |
| `action`            | 命中后的动作，见 §4.5                                                                                                         |
| `position`          | 自定义点击位置（相对节点，`left/top/right/bottom` 与 `x/y` 组合；支持 `width/height/screenWidth/screenHeight/random` 表达式） |
| `swipeArg`          | 滑动参数 `{ start, end?, duration }`                                                                                          |
| `matches`           | 一个或多个选择器；**全部**能匹配时才执行，点击**最后一个**选择器匹配到的目标节点                                              |
| `anyMatches`        | 一个或多个选择器；**任一**匹配即可，点击该节点；全部不匹配则停止本规则                                                        |
| `excludeMatches`    | 任一匹配则停止本规则                                                                                                          |
| `excludeAllMatches` | 全部匹配才停止本规则                                                                                                          |

> 点击优先级：`matches` > `anyMatches`。

### 4.4 规则组 / 应用 / 全局字段

| 类型                 | 字段                                                                                                                 | 说明                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `RawGroupProps`      | `key`、`name`（必填）、`desc`、`enable`（默认 true）、`scopeKeys`                                                    | `enable` 是客户端启停依据；`scopeKeys` 允许引用其它组的 rule 做 `preKeys`/共享冷却 |
| `RawAppRuleProps`    | `activityIds`、`excludeActivityIds`、`versionCode`、`versionName`                                                    | 界面/版本限定；`exclude*` 优先级高于包含项；`.` 开头等价于 appId + 该值            |
| `RawGlobalRuleProps` | `matchAnyApp`（默认 true）、`matchLauncher`（默认 false）、`matchSystemApp`（默认 false）、`apps[]`                  | 全局规则的应用范围                                                                 |
| `RawGlobalGroup`     | `disableIfAppGroupMatch`                                                                                             | 若某应用存在以此开头的规则组，则本全局组不匹配该应用                               |
| `RawAppGroup`        | `rules`、`ignoreGlobalGroupMatch`                                                                                    | 规则列表；`ignoreGlobalGroupMatch` 避免被全局规则误伤                              |
| `RawSubscription`    | `id`、`name`、`version`、`author`、`updateUrl`、`checkUpdateUrl`、`supportUri`、`apps`、`globalGroups`、`categories` | `version` 必须递增才会更新                                                         |
| `RawCategory`        | `key`、`name`、`enable`                                                                                              | `name` 前缀捕获应用规则组；`enable` 默认 null（跟随组）                            |

**`enable` 的粒度**：只有规则组（`group.enable`）、分类（`category.enable`）、全局规则的应用配置（`apps[].enable`）可以开关；**单条 rule 没有 `enable` 字段**。

`versionCode` 是 `{ exclude?, include?, minimum?, maximum? }`；`versionName` 是 `{ exclude?, include?, pattern? }`。

### 4.5 action 取值

| 值                                                | 行为                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `click`（默认）                                   | 目标可点击时 `clickNode`，否则 `clickCenter`；`clickNode` 未被应用接收时回退 `clickCenter` |
| `clickNode`                                       | 向系统发节点点击；节点在屏幕外/被遮挡也能触发；非 clickable 节点通常无效果                 |
| `clickCenter`                                     | 点节点中心；中心在屏幕外视为未匹配；被遮挡会点到最上层节点                                 |
| `back`                                            | 返回键                                                                                     |
| `longClick` / `longClickNode` / `longClickCenter` | 长按的三种策略；`longClickCenter` 长按 400ms                                               |
| `swipe`                                           | 滑动，参数由 `swipeArg` 定义                                                               |
| `none`                                            | 不执行动作，仅作为匹配标记                                                                 |

默认值联动：有 `position` 时默认 `clickCenter`；有 `swipeArg` 时默认 `swipe`。

### 4.6 防误触三件套

```json5
{
  key: 0,
  name: '开屏广告',
  matchTime: 10000,
  actionMaximum: 1,
  resetMatch: 'app',
  rules: [{ key: 0, matches: '[text*="跳过"][text.length<10][visibleToUser=true]' }],
}
```

- `matchTime`：只在该时段参与匹配，防止离开开屏后仍误点。
- `actionMaximum`：最多点几次。
- `resetMatch`：`activity`（默认，界面刷新重置）/ `match`（由不匹配切到匹配时重置）/ `app`（重进应用重置）。
- 宽泛规则再加 `activityIds`、`excludeMatches`、`preKeys`。

---

## 5. 查询优化

### 5.1 根节点与主动查询

- 根节点写法：`[parent=null]` 或 `[depth=0]`；只要选择器里出现 `[parent=null]`，就按“从根节点查询”优化。
- `A > B` 默认需要从事件节点深度遍历；写成 `[parent=null] >n B` 时可直接取根节点，避免逐层取 parent。
- 位置类优化：`TextView <3 LinearLayout <2 [parent=null]` 只判断一次。

### 5.2 fastQuery（快速查询）

启用条件：规则/组上 `fastQuery: true`，且目标节点在快照面板被标为“可快速查找”。

**格式要求**：最右侧属性选择器的**第一个**属性表达式必须形如：

```text
[id='abc']  [vid='abc']  [text='abc']  [text^='abc']  [text*='abc']  [text$='abc']
```

或用 `||` 连接的同类表达式。**顺序敏感**：

```text
A > B + C[id='x'][childCount=2]   ✅
A > B + C[childCount=2][id='x']   ❌（第一个表达式不是快速查询条件）
```

- 局部快速查找：该属性选择器右侧是 `<<n` 时也生效。
- `||` 组合：每个分支都必须合格，否则整个 `||` 的全局 fastQuery 失效。
- `&&` 组合：任一分支合格即可（多个候选取并集）。
- `!(...)` 会取消其内部所有快速查询。
- fastQuery 会改变返回顺序，首个匹配节点可能与普通深度优先不同；需要严格先序时不要开。

### 5.3 正则快速路径

以下正则会自动降级为内置字符串函数（ASCII 忽略大小写）：

```text
[text~="(?is)abc.*"]     -> startsWith('abc')
[text~="(?is).*abc.*"]   -> contains('abc')
[text~="(?is).*abc"]     -> endsWith('abc')
```

只做简单前后缀/包含且忽略大小写时，直接用 `^=`/`*=`/`$=` 更稳。

### 5.4 跨平台正则

Android 用 Kotlin `Regex`（Java `Pattern`），浏览器/Node 用 `regex-wasm`（Kotlin/Wasm `Regex`），少数 JVM 专用字符类与边界行为可能不同。跨平台规则避免 JVM 专用语法，并在两端分别验证。

---

## 6. 编写流程（从快照到规则）

两种入口：在 Inspect 里手动点选节点后用 §6.1 检验；只有截图 + 节点树时用 §6.2 定位。

1. **打开快照**：`https://i.gkd.li/i/<id>`，选中目标节点，看属性面板里的 `id`/`vid`/`text`/`desc`/`clickable` 与层级。
2. **选最稳属性**：`id` > 精确 `text`/`desc` > `vid` > 结构关系；文本类优先加 `text.length` 约束。
3. **从右往左写**：把最具体、最能缩小候选集的属性选择器放最右端。
4. **需要点容器时用 `@`**：`@LinearLayout > TextView[id=...]`。
5. **加边界**：`activityIds` 限定界面；`excludeMatches` 排除误匹配；开屏类加 `matchTime` + `actionMaximum`。
6. **在审查工具验证**：搜索框实时查询，看“选择器路径视图”确认匹配顺序与方向。
7. **写进规则**：`matches: '...'`（单个）或 `matches: ['A', 'B']`（多个，全部匹配才点最后一个的目标）。需要 OR 用 `anyMatches`。
8. **回填 `snapshotUrls`**，真机验证；flutter/webview 页面匹配不到时尝试 `matchRoot: true` 或 `forcedTime`。

### 6.1 在网页审查工具中检验（i.gkd.li）

**步数预算：3 步**（搜一次 → 核对命中与路径 → 输出）。

网页审查工具 <https://i.gkd.li> 就是选择器的试验场：左侧节点树 + 截图，右侧属性面板，顶部搜索框可直接执行选择器，命中的节点会高亮，并可在“选择器路径视图”里看到匹配顺序与查找方向。

**检验步骤**

1. **打开快照**：`https://i.gkd.li/i/<id>`（GKD 分享出来的链接）；确认页面显示的应用、界面、屏幕尺寸与目标一致。地址栏里 `/snapshot/<时间戳>` 的本地链接不能分享，别用它当 `snapshotUrls`。
2. **选中目标**：在节点树点选，或直接在截图上点；在属性面板核对 `id`/`vid`/`name`/`text`/`desc`/`clickable`/`visibleToUser`/`left`/`top`/`right`/`bottom`/`index`/`depth`。
3. **搜索框实测**：粘贴选择器回车。
   - 命中数量：必须恰好命中目标；命中多个时要能解释差异，或收紧条件；
   - 高亮框：与截图上目标控件的位置一致；
   - 选择器路径视图：确认匹配顺序是**从右往左**、关系方向符合预期（`A > B` 中 A 是祖先）。
4. **反向验证（防误触）**：
   - 用同应用其它界面的快照（或反例快照）再搜一次，确认不会误匹配；
   - 加 `excludeMatches` 后重新搜索，确认排除生效；
   - flutter/webview 界面若“快照能搜到、真机不触发”，从 `[parent=null]` 写起，或给规则加 `matchRoot: true`。
5. **快速查询资格**：只有节点在快照面板被标为“可快速查找”时，才给规则加 `fastQuery: true`；否则保持默认，避免结果顺序变化（见 §5.2）。
6. **规则级检查**（不能只测选择器）：
   - `matches` 多个选择器是 **AND**，最终点最后一个的目标；需要 OR 用 `anyMatches`；
   - `action` 与节点能力匹配：可点击用 `clickNode`/`click`，不可点击或坐标点在屏幕外用 `clickCenter`；
   - `activityIds` 与快照界面一致；开屏类补 `matchTime`/`actionMaximum`/`resetMatch`；
   - 把选择器放进 JSON5 后检查转义（反斜杠写 `\\`，正则 `\d` 写 `\\\\d`），再粘回搜索框确认仍能解析；
   - 回填 `snapshotUrls`，必要时补 `excludeSnapshotUrls`。
7. **固化结果**：在审查工具里生成/复制分享链接 `https://i.gkd.li/i/<id>` 写进规则；本地快照链接只对当前浏览器有效。

> `_id`/`_pid` 只适合在审查工具里锁定调试节点；写进规则前必须换成 `id`/`vid`/`text`/`desc`/结构关系，真机不认 `_id`。

**通过标准**

- 选择器在快照中命中且只命中预期节点（或差异可用 `excludeMatches` 解释）；
- 路径视图的方向与选择器语义一致；
- `action`/`activityIds`/`matchTime`/`fastQuery` 与节点能力、界面一致；
- JSON5 可解析、转义正确；
- 反例快照不命中。

**常见失败与处理**

| 现象                           | 处理                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------- |
| 审查工具命中、真机不触发       | 加 `matchRoot: true`，或选择器从 `[parent=null]` 写起                        |
| 命中多个无关节点               | 收紧属性（`text.length`、`visibleToUser`、`clickable`）或加 `excludeMatches` |
| 提示“非法选择器”               | 检查属性/关系间空白、`!!`、类型不匹配、`\d` 少转义一层                       |
| `fastQuery` 结果顺序与预期不同 | 关闭 `fastQuery`，或按 §5.2 调整最右属性表达式                               |
| 点击无效果                     | 非 clickable 节点改用 `clickCenter`；被遮挡时改 `clickNode`                  |

### 6.2 由截图 + 节点树定位节点（视觉流程）

**步数预算：5 步定位（估框 → 换算 → 筛选 → 消歧 → 指认）+ 2 步输出（写选择器 → 自检）**。

适用：拿到一张**原始未标注截图**和整棵节点树。具备视觉能力的模型按本节执行；不能看图的模型跳过第 1–2 步，并在输出中声明“未使用截图”。

**输入契约**

| 字段   | 说明                                                                                                                                                                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 任务   | 用户想做什么，例如“跳过开屏广告”“点右上角关闭”“关闭青少年弹窗”                                                                                                                                                                                                  |
| 截图   | 原始未标注；必须知道 `imageWidth × imageHeight`（图片原始像素，不是聊天框显示尺寸）                                                                                                                                                                             |
| 屏幕   | 快照的 `screenWidth × screenHeight`，以及 `isLandscape`                                                                                                                                                                                                         |
| 节点树 | **原样使用输入**：GKD 快照的 `nodes` 数组（扁平、含 `pid`）或 JSONL 都可直接读；JSONL 键：`i`=id、`p`=pid、`n`=name、`id`/`vid`、`t`=text、`d`=desc、`ix`=index、`dp`=depth、`cc`=childCount、`clk`=clickable、`vis`=visibleToUser、`r`=[left,top,right,bottom] |

> **不要为了格式先转换**：扁平 `nodes` 数组按 `pid` 建一个 id→节点 的映射即可，嵌套树按层级读。

**坐标映射**

```text
截图 x = 屏幕 x × (imageWidth  / screenWidth)
截图 y = 屏幕 y × (imageHeight / screenHeight)
```

截图通常是整屏等比缩放，两个比例一般相同；若图片带黑边或聊天框缩放，一律按**图片原始像素**换算，不要用显示尺寸。先把目标控件的像素框估出来，再反算屏幕坐标，去树里找 `r` 最接近的节点。

**步骤**

1. **看图定框**：读任务，在截图中找到目标控件；给出它的文字/图标特征、相对位置（如“右上角”“底部居中”）和估计像素框 `[x1,y1,x2,y2]`。
2. **换算坐标**：用上面的比例把像素框换回屏幕坐标，得到搜索框 `[L,T,R,B]`。
3. **树内筛选**（直接用输入格式，不重排）：
   - `vis=true`；
   - `r` 与搜索框重叠，或包含搜索框中心点；
   - `t`/`d` 与图中文字一致（注意截断、省略号、简繁差异）；
   - 优先 `clk=true`、面积小、`dp` 深（更具体的控件）；
   - 用 `pid` 建 id→节点 映射，祖先/父子关系按需回溯；
   - 列出 3–8 个候选，逐个标注 `#id`、文字、`r`、保留/排除原因。
4. **消歧**：多个“关闭/跳过/取消”时，用 `r` 中心与搜索框中心的距离、面积（排除接近全屏的容器）、父子关系（同一弹窗内）、文字长度区分；仍不确定就并列前 2 个候选并说明差异，不要硬选。
5. **指认目标**：给出最终 `#id`；核对它的 `r` 与第 1 步像素框是否落在同一区域，不一致就回到第 1 步重估。
6. **写选择器**：只用树里真实存在的 `id`/`vid`/`text`/`desc`/`clickable`/`visibleToUser` 与结构关系；禁止 `_id`/`_pid`；从右往左写，最具体条件放最右；需要点容器时用 `@`。
7. **输出与自检**：按下方格式输出，并逐项核对属性存在性、关系方向、`matches` 的 AND 语义、JSON 转义。

**输出格式**

```markdown
## 目标

#id；文字/图标；图中位置；估计像素框 [x1,y1,x2,y2] → 屏幕框 [L,T,R,B]；置信度 高/中/低

## 候选与排除

- #12 ...（保留：文字“跳过”，rect 与右上角吻合）
- #7 ...（排除：全屏容器，childCount=24）
- #31 ...（排除：visibleToUser=false）

## 选择器

`...`

## 规则组（JSON5）

...

## 备选选择器

`...`（为什么备选）

## 自检

- [ ] 选择器里每个属性都在该节点 JSON 中存在
- [ ] 匹配方向从右往左，`>` 表示祖先
- [ ] `matches` 为 AND；OR 已改用 `anyMatches`
- [ ] JSON 转义正确（`\` 双写，正则多一层）
```

**视觉识别的边界**

- 看不清、被遮挡、纯图标无文字：不要编造，列出候选并标注“需人工确认”。
- 图与树冲突：**属性以树为准，意图以图为准**；先写明冲突点再选择。
- 同一文字多个节点：必须靠 `r` 位置区分，不能只凭 `text`。
- 树里找不到与像素框匹配的节点：说明截图与节点树可能不是同一快照，**停止并报告**，不要硬凑。
- 不能看图：只依据节点树，置信度标“低”，并明确声明未使用截图。

**常见错误**

| 错误                       | 纠正                                         |
| -------------------------- | -------------------------------------------- |
| 只按 `text` 选第一个“关闭” | 用 `r` 中心与目标像素框匹配                  |
| 选中全屏容器               | 排除面积接近屏幕、`cc` 很大、`dp` 很浅的节点 |
| 用 `_id` 写选择器          | 换成属性与结构关系，真机不认 `_id`           |
| 把聊天框显示尺寸当原图尺寸 | 用 `imageWidth`/`imageHeight` 换算           |
| 忽略 `vis=false`           | 只从可见节点里选                             |
| 图片缩放/黑边导致偏移      | 按比例换算，并用多个节点交叉验证             |

---

## 7. 常见错误与反模式

| 症状 / 写法                              | 原因                                                        | 修复                                                      |
| ---------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| `div>img` 报语法错误                     | 属性与关系选择器之间缺空白                                  | 写成 `div > img`                                          |
| `!!(a=1)` 非法                           | `!` 后只能接一个 `(...)`                                    | `!(a=1)`                                                  |
| 明明要选父节点却选中了子节点             | `A > B` 中 A 是祖先，方向记反                               | 目标在左用 `@`，或改 `A < B`                              |
| 快照能搜到，真机不触发                   | 匹配起点是事件节点，不是根节点                              | 规则加 `matchRoot: true`，或选择器从 `[parent=null]` 写起 |
| 开屏点完还继续乱点                       | 规则没有时间/次数边界                                       | `matchTime` + `actionMaximum` + `resetMatch: 'app'`       |
| `[text!='x']` 与 `[text!$='x']` 结果不同 | 非 `=`/`!=` 操作符遇 null 返回 false                        | 需要含 null 时写 `[text=null \|\| !(text$='x')]`          |
| `a>''` 提示非法类型                      | 操作符与值类型不匹配                                        | 数值用 int；字符串用 `^=`/`*=`/`$=`/`~=`                  |
| 写多个选择器以为是 OR                    | `matches` 语义是全部匹配，点最后一个                        | 需要 OR 用 `anyMatches`                                   |
| `[text~="\d"]` 在审查工具报非法          | 选择器字符串先被转义一次                                    | 选择器里写 `\\d`；放进 JSON 再写到 `\\\\d`                |
| 规则里选择器坏掉                         | 只做了一层 JSON 转义                                        | 见下方转义表，规则字符串里把 `\` 双写                     |
| `fastQuery` 开了没效果                   | 格式不对/第一个表达式顺序错/`\|\|` 有不合格分支/在 `!()` 内 | 按 §5.2 重排条件                                          |
| 点击没反应                               | 非 clickable 节点用了 `clickNode`                           | 改 `clickCenter`；反之被遮挡时改 `clickNode`              |
| 同一广告连点多次                         | 无冷却或多规则同时命中                                      | `actionCd`，多规则共享 `actionCdKey`/`actionMaximumKey`   |
| 规则在别的界面误触发                     | 未限定界面                                                  | `activityIds` + `excludeActivityIds`                      |
| 规则在组件内部乱序执行                   | 依赖顺序却没约束                                            | `preKeys` 串联                                            |
| 用了 `_id`/`_pid`                        | 仅快照可用                                                  | 换成 `id`/`vid`/`text`/结构关系                           |

### 转义层级

| 场景                       | 写法                                               |
| -------------------------- | -------------------------------------------------- |
| 选择器里匹配一个反斜杠 `\` | `TextView[text="\\\\"]`（选择器内）                |
| 放进 JSON5 的 `matches`    | 再双写一层：`matches: 'TextView[text="\\\\\\\\"]'` |
| 选择器里用正则 `\d`        | 选择器内 `\\d`；JSON 内 `\\\\d`                    |
| 正则匹配一个字面反斜杠     | JSON 内需 8 个反斜杠（4 层转义）                   |

规律：**选择器 string 一层 + JSON string 一层 + 正则一层**，逐层翻倍。

---

## 8. 交付前自检清单

> 日常只做前 5 项（属性存在、方向、AND/OR、转义、界面限定）；批量或发布前再跑完整清单。

- [ ] 选择器在 <https://i.gkd.li> 对应快照里能唯一/稳定命中目标。
- [ ] 首尾是属性选择器，属性与关系之间都有空白。
- [ ] `>`/`<`/`+`/`-` 方向与意图一致；`@` 放在正确的属性选择器上。
- [ ] 没有依赖 `_id`/`_pid`；没有 `!!`；`!` 后都有 `(...)`。
- [ ] `matches` 与 `anyMatches` 语义用对（AND vs OR）。
- [ ] 规则有 `activityIds` 或 `matchTime`/`actionMaximum` 等边界，宽泛选择器有 `excludeMatches`。
- [ ] `fastQuery` 只在格式满足时开启；`||` 分支全部可快速查询。
- [ ] JSON 转义层数正确（选择器 / JSON / 正则）。
- [ ] 规则组 `key`、`name` 必填且稳定；`enable` 默认值符合预期。
- [ ] 回填了 `snapshotUrls`（以及必要的 `excludeSnapshotUrls`）。

---

## 9. 参考链接

- 选择器语法：<https://gkd.li/guide/selector>
- 属性方法：<https://gkd.li/guide/node>
- 选择示例（均可点开快照实测）：<https://gkd.li/guide/example>
- 查询优化：<https://gkd.li/guide/optimize>
- 快照审查与分享：<https://gkd.li/guide/snapshot>
- 订阅规则：<https://gkd.li/guide/subscription>
- API 类型：<https://gkd.li/api/interfaces/RawAppRule>、<https://gkd.li/api/interfaces/RawCommonProps>
- 文档源码：<https://github.com/gkd-kit/docs/tree/main/gkd-docs>
- 规则仓库与讨论：<https://github.com/gkd-kit>、<https://github.com/orgs/gkd-kit/discussions>
