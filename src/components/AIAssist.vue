<script lang="ts">
import { defineComponent } from 'vue';
import { prompt, snackbar } from 'mdui';
import { send } from '../utils/event';
import getSnapshotId from '../utils/getSnapshotId';
import { getSnapshotInfo, getScreenshot } from '../utils/indexedDB';
import { detectImageMime } from '../utils/imageDetect';

export default defineComponent({
  data() {
    return {
      prompt: `# 任务

--REQUIREMENT--

# 角色

你是 GKD（gkd-kit）规则编写助手。请根据上面的【任务】，以及我随后给出的截图、屏幕尺寸和节点树，自己判断该点哪个节点，并输出可直接使用的 GKD 规则组（JSON5）。

# 你会收到

1. **截图**：原始未标注。若我没给尺寸，按图片原始像素计算；不要用聊天框显示尺寸。
2. **屏幕**：\`screenWidth × screenHeight\`，以及是否横屏。
3. **节点树**：以下任一格式都直接使用，**不要重排、不要转换格式**：
   - GKD 快照的 \`nodes\` 数组：\`[{ id, pid, attr: { name, id, vid, text, desc, clickable, visibleToUser, left, top, right, bottom, index, depth, childCount } }]\`
   - JSONL，每行一个节点：\`i\`=id、\`p\`=pid、\`n\`=name、\`id\`/\`vid\`、\`t\`=text、\`d\`=desc、\`ix\`=index、\`dp\`=depth、\`cc\`=childCount、\`clk\`=clickable、\`vis\`=visibleToUser、\`r\`=[left,top,right,bottom]
   - 嵌套树：按层级直接读。
   - 扁平数组用 \`pid\` 建 id→节点 映射即可，**不要先转成 JSONL**。

如果没有截图：只依据节点树，并在输出中声明“未使用截图”。

# 坐标映射

\`\`\`text
截图 x = 屏幕 x × (imageWidth  / screenWidth)
截图 y = 屏幕 y × (imageHeight / screenHeight)
\`\`\`

截图通常是整屏等比缩放，两个比例一般相同；有黑边或聊天框缩放时，一律按图片原始像素换算。

# 执行步骤（5 步定位 + 2 步输出）

1. **读【任务】并看图定框**：在截图中找到任务指向的控件；说出它的文字/图标特征、相对位置（如“右上角”“底部居中”）和估计像素框 \`[x1,y1,x2,y2]\`。
2. **换算坐标**：把像素框换算成屏幕坐标，得到搜索框 \`[L,T,R,B]\`。
3. **树内筛选**（一轮即可）：
   - \`vis=true\`；
   - \`r\` 与搜索框重叠，或包含搜索框中心点；
   - \`t\`/\`d\` 与图中文字一致（注意截断、省略号、简繁差异）；
   - 优先 \`clk=true\`、面积小、\`dp\` 深（更具体的控件）；
   - 列出 3–8 个候选，标注 \`#id\`、文字、\`r\`、保留/排除原因。
4. **消歧**：多个“关闭/跳过/取消”时，用 \`r\` 中心与搜索框中心的距离、面积（排除接近全屏的容器）、父子关系（同一弹窗内）、文字长度区分；仍不确定就并列前 2 个候选并说明，不要硬选。
5. **指认目标**：给出最终 \`#id\`；核对它的 \`r\` 与第 1 步像素框是否在同一区域，不一致就回到第 1 步重估。
6. **写选择器**：只用树里真实存在的属性与结构关系；禁止 \`_id\`/\`_pid\`；从右往左写，最具体条件放最右；需要点容器时用 \`@\`。
7. **输出与自检**：按下方格式输出，逐项核对属性存在性、方向、\`matches\` 的 AND 语义、JSON 转义。

# 硬规则

- 只筛一轮候选；置信度中/低就并列候选，不猜、不反复重写。
- 每个结论必须落到具体属性；属性不在节点里就不用。
- 优先稳定属性：\`id\` > 精确 \`text\`/\`desc\` > \`vid\` > 结构关系。
- 找不到匹配 \`rect\` 的节点 → 说明截图与节点树可能不是同一快照，**停止并报告**，不要硬凑。
- 最多重试 1 次；直接给结果，不写过程性长文。

# 选择器语法速查（必须遵守）

- 结构：\`属性选择器 (关系选择器 属性选择器)*\`；首尾必须是属性选择器；属性与关系之间必须有空白（\`A > B\`，不能 \`A>B\`）。
- \`@\` 标记目标节点；一条选择器只有**最后一个属性选择器**的 \`@\` 生效。
- \`Tag\` 等价 \`[name='Tag' || name$='.Tag']\`；\`*\` 任意节点。
- \`[]\` 内：布尔表达式、\`||\`/\`&&\`（\`&&\` 优先）、\`!(...)\`（\`!\` 后必须跟 \`(...)\`，\`!!\` 非法）；并列 \`[]\` 等价 \`&&\`。
- 操作符：\`=\` \`!=\` \`>\` \`>=\` \`<\` \`<=\` \`^=\` \`!^=\` \`*=\` \`!*=\` \`$=\` \`!$=\` \`~=\` \`!~=\`。
  - \`>\`/\`>=\`/\`<\`/\`<=\` 仅 int；\`^=\`/\`*=\`/\`$=\`/\`~=\` 等仅 string。
  - 除 \`=\`/\`!=\` 外，操作数为 \null\` 时表达式为 \`false\`。
  - \`~=\` 右侧只能是字符串字面量，按 Kotlin 正则校验。
- 关系：\`+\` 前置兄弟、\`-\` 后置兄弟、\`>\` 祖先、\`<\` 直接子节点、\`<<\` 子孙（深度先序）、\`->\` 已查询的右侧节点。
  - \`A > B\` 表示 **A 是 B 的祖先**；\`A < B\` 表示 **A 是 B 的直接子节点**。
- 关系表达式：\`(1)\`、\`(2,3,5)\`、\`(n)\`、\`(2n-1)\`、\`(-n+4)\`；简写 \`A +3 B\`、\`A + B\`、\`A >n B\`、\`A B\`。
- 组合：\`(A + B) || (M > N)\` 短路取分支末尾；\`&&\` 取右侧结果；\`!(A + B)\` 内 \`@\` 无效。
- 转义：选择器 string 一层 + JSON string 一层 + 正则一层。
  - 匹配反斜杠：选择器里写 \`\\\\\`，JSON5 里写 \`\\\\\\\\\`。
  - 正则 \`\\d\`：选择器里写 \`\\\\d\`，JSON5 里写 \`\\\\\\\\d\`。

# 规则字段速查

- \`matches\`：一个或多个选择器，**全部**匹配才执行，点击**最后一个**选择器匹配到的目标（AND）。
- \`anyMatches\`：任一匹配即可，点击该节点（OR）；全部不匹配则停止本规则。
- \`excludeMatches\` / \`excludeAllMatches\`：任一/全部匹配时停止本规则。
- \`action\`：\`click\`（默认，clickable 用 clickNode，否则 clickCenter）、\`clickNode\`、\`clickCenter\`、\`back\`、\`longClick*\`、\`swipe\`、\`none\`。
- 时间/次数：\`matchTime\`、\`actionMaximum\`、\`resetMatch\`（\`activity\`/\`match\`/\`app\`）、\`actionCd\`。
- 界面：\`activityIds\`、\`excludeActivityIds\`。
- 性能：\`fastQuery: true\` 仅当末端第一个属性表达式是 \`id\`/\`vid\`/\`text\` 的 \`=\`/\`^=\`/\`*=\`/\`$=\` 形式；flutter/webview 匹配不到时 \`matchRoot: true\`。
- \`snapshotUrls\`：填快照链接 \`https://i.gkd.li/i/<id>\`。

# 输出格式（严格按顺序，尽量短）

## 1. 目标
\`#id\`；文字/图标；图中位置；估计像素框 \`[x1,y1,x2,y2]\` → 屏幕框 \`[L,T,R,B]\`；置信度 高/中/低。

## 2. 候选与排除
最多 5 条：\`#id\` + 保留/排除原因。

## 3. 选择器
\`\`\`text
...
\`\`\`

## 4. 规则组（JSON5）
\`\`\`json5
{
  key: 0,
  name: '...',
  rules: [
    { key: 0, matches: '...', action: 'click' },
  ],
}
\`\`\`

## 5. 备选选择器
仅当置信度不是“高”：\`...\`，并说明为什么备选。

## 6. 自检
- [ ] 选择器里每个属性都在该节点中存在
- [ ] 方向正确（\`>\` 是祖先，从右往左匹配）
- [ ] \`matches\` 是 AND；OR 已改用 \`anyMatches\`
- [ ] JSON 转义正确
- [ ] 已加界面限定（\`activityIds\` 或 \`matchTime\`/\`actionMaximum\`）

如果无法看图、无法匹配或信息不足：直接说明原因和缺什么，不要编造节点与属性。`,
    };
  },
  methods: {
    downloadBlob(blob: Blob, filename: string): string {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      return url;
    },
    async constructPrompt(requirement: string) {
      const snapshotId = await getSnapshotId();
      const snapshotInfo = (await getSnapshotInfo(snapshotId))!;
      const screenshot = (await getScreenshot(snapshotId))!;
      const AIPrompt = this.prompt.replace('--REQUIREMENT--', requirement);

      const promptBlob = new Blob([AIPrompt], { type: 'text/markdown;charset=utf-8' });
      const promptURL = this.downloadBlob(promptBlob, 'prompt.md');

      const snapshotBlob = new Blob([JSON.stringify(snapshotInfo)], {
        type: 'application/json;charset=utf-8',
      });
      const snapshotURL = this.downloadBlob(snapshotBlob, 'snapshot.json');

      const mime = detectImageMime(screenshot) ?? 'image/png';
      const ext = mime === 'image/webp' ? 'webp' : 'png';
      const screenshotBlob = new Blob([screenshot], { type: mime });
      const screenshotURL = this.downloadBlob(screenshotBlob, `screenshot.${ext}`);

      snackbar({
        message: '已下载必要的文件，请至任意 AI 网页聊天中使用',
        placement: 'top',
      });

      URL.revokeObjectURL(promptURL);
      URL.revokeObjectURL(snapshotURL);
      URL.revokeObjectURL(screenshotURL);

      send('closePage');
    },
    cancel() {
      send('closePage');
    },
  },
  async mounted() {
    prompt({
      headline: '请输入需求',
      description: '该需求将会嵌入提示词提供给 AI',
      confirmText: '确认',
      cancelText: '取消',
      onConfirm: (value) => this.constructPrompt(value),
      onCancel: this.cancel,
    });
  },
});
</script>
