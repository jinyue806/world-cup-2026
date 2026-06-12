---
name: wc26
version: "1.0.0"
description: "世界杯 2026 零依赖对话式投注账本。朋友间赌球，说一句话就记上。触发场景：记一笔注单、下注记录、世界杯赌球、WC26 投注、投注账本、查看盈亏、结算注单、更新比分、删除注单、积分榜、重置数据、导入下注。不要在讨论赌球文化或新闻时触发。"
tags: ["world-cup", "betting", "cli", "ledger", "2026"]
---

# WC26 世界杯投注账本

> 零部署 · 零依赖 · 对话式 · 自动结算

通过对话管理 2026 世界杯投注。支持 5 种玩法、自动结算、盈亏统计、积分榜。

## 环境

无硬性依赖。所有命令通过 `npx tsx src/cli.ts <command>` 执行。
如果报错找不到 tsx，先运行 `npm install -g tsx`。

## 首次使用

用户第一次提到世界杯/投注时，执行以下初始化：

```bash
cd <skill目录> && npx tsx src/cli.ts init
```

然后告诉用户："世界杯账本已初始化，104 场比赛已加载。你可以开始下注了。"

## 日常操作

### 记一笔（简化输入）

用户说以下任意形式：
- "韩国赢捷克 100"
- "巴西 vs 阿根廷，巴西赢 200"
- "记一笔韩国赢 50"
- "下注阿根廷 100"

**Agent 自动补全流程**：

1. 解析用户输入，提取：赢的队伍、对手（可选）、金额
2. 查找比赛：`npx tsx src/cli.ts list-matches`
3. 获取赔率：`npx tsx src/cli.ts odds --team <赢的队伍>`
4. 构造完整命令并执行：
```bash
npx tsx src/cli.ts add-bet --match match_6 --type 1X2 --selection 韩国 --odds <从API获取> --stake 100
```

**关键**：赔率从 API 实时获取，不要让用户手动输入。用户只需说"谁赢 + 金额"。

**简化输入示例**：
| 用户输入 | Agent 补全 |
|:---------|:-----------|
| 韩国赢捷克 100 | match=韩国vs捷克, selection=韩国, odds=从API, stake=100 |
| 巴西赢 200 | match=巴西vs?, selection=巴西, odds=从API, stake=200 |
| 记一笔韩国赢 50 | 同上 |
| 下注阿根廷 100 | 同上 |

### 批量导入

用户粘贴投注记录文本时，保存到文件后导入：

```bash
npx tsx src/cli.ts import-bets --file bets.txt
```

文本格式：每行一条，如 `韩国 v 捷克 足球波胆 1-2@11.0 投注金额:100.00`

### 更新比分

用户说："韩国 2 - 1 捷克"

```bash
npx tsx src/cli.ts update-match --match match_6 --score-a 2 --score-b 1
```

比分更新后自动结算该比赛的所有注单。

### 查看盈亏

用户说："我赢了多少" / "看看账本"

```bash
npx tsx src/cli.ts query
```

### 查看积分榜

用户说："看看 A 组情况"

```bash
npx tsx src/cli.ts standings --group "Group A"
```

超过 30 分钟自动从 API 刷新积分榜。

### 删除注单

```bash
npx tsx src/cli.ts delete-bet --id <betId>
```

## 定时结算（其他智能体）

其他智能体可定时运行检查比赛结果：

```bash
npx tsx src/cli.ts check-and-notify
```

输出 `data/notify.json`，包含结算摘要。有结算时才输出，无操作时静默。

## 安全边界

- 不会联网调用外部 API（积分榜自动刷新有 30 分钟缓存，失败时静默回退）
- 不会删除用户数据（`reset` 命令需要 `--confirm true`）
- 不会泄露任何信息（纯本地 JSON 存储）

## 完整命令

见 `references/commands.md`。

## 结算规则

见 `references/bet-rules.md`。
