# Skills

本目录按 [Agent Skills](https://agentskills.io) 规范组织，供 `skills` 等工具从本仓库直接发现与安装。

## 已收录

| 技能           | 说明                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| `gkd-selector` | GKD（gkd-kit）选择器与订阅规则编写：语法、规则字段、查询优化、常见误用 |

## 安装

```bash
pnpm dlx skills add adproqwq/MikuMagicWand --skill gkd-selector -a codex
```

```bash
pnpm dlx skills add adproqwq/MikuMagicWand --skill gkd-selector -a claude-code # For Claude Code
```

安装后技能出现在 `~/.agents/skills/gkd-selector/`（或对应 agent 的技能目录）。

## 许可

`gkd-selector/` 归纳自 GKD 官方文档（GPL-v3），以 GPL-3.0 发布，见 `gkd-selector/LICENSE`。

仓库其余内容（用户脚本）仍为 MIT，见根目录 `LICENSE`。
