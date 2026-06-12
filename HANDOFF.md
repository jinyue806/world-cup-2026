# WC26 世界杯投注账本 — 交接文档

**日期**: 2026-06-12
**项目**: `wc26/` — 零依赖对话式世界杯投注 CLI
**状态**: 世界杯进行中（6月11日开赛），需每日维护

---

## 快速开始

```bash
cd wc26
npm install          # 首次安装（可选，npx tsx 自动处理）
npx tsx src/cli.ts init   # 初始化 104 场比赛
```

## 常用命令

| 命令 | 说明 |
|:-----|:-----|
| `add-bet --match "韩国 vs 捷克" --type 1X2 --selection 韩国 --odds 2.5 --stake 100` | 下注（支持队名自动匹配） |
| `status --summary` | 精简状态（注单+即将开赛） |
| `odds` | 查看实时赔率 |
| `analytics` | 数据分析报告 |
| `query` | 盈亏统计 |
| `check-and-notify` | 定时结算 |

## 定时任务（重要）

世界杯期间需要定时执行：

### 每日任务
```bash
# 每天比赛结束后结算
npx tsx src/cli.ts check-and-notify

# 查看今日盈亏
npx tsx src/cli.ts analytics --days 1
```

### 每轮比赛后
```bash
# 更新积分榜
npx tsx src/cli.ts fetch-standings

# 查看积分榜
npx tsx src/cli.ts standings
```

### 关键时间点
- **小组赛**: 6月11日-6月27日（每天有比赛）
- **淘汰赛**: 6月29日-7月15日
- **决赛**: 7月19日

## API 配置

投注平台 API（yhnm381.com）已集成，可查看实时赔率：

```bash
# 设置 API 地址（如需要）
set WC26_API_BASE=https://swiftpioneer188.com/worldcup

# 查看赔率
npx tsx src/cli.ts odds
npx tsx src/cli.ts odds --detail
```

## 文件结构

```
wc26/
├── SKILL.md              ← AI 指令
├── README.md             ← 人类入口
├── HANDOFF.md            ← 本文件
├── package.json
├── references/
│   ├── commands.md       ← 完整命令参考
│   ├── bet-rules.md      ← 结算规则
│   └── help.txt          ← 帮助文本
└── src/
    ├── cli.ts            ← CLI 路由
    ├── commands/          ← 7 个命令模块
    │   ├── bet.ts        ← 下注/删除/导入
    │   ├── match.ts      ← 比分/状态/列表
    │   ├── query.ts      ← 盈亏/积分榜
    │   ├── bracket.ts    ← 淘汰赛
    │   ├── admin.ts      ← 初始化/重置/结算
    │   ├── odds.ts       ← 实时赔率
    │   └── analytics.ts  ← 数据分析
    ├── lib/              ← 8 个核心模块
    │   ├── storage.ts    ← JSON 存储
    │   ├── settler.ts    ← 结算逻辑
    │   ├── parser.ts     ← 文本解析
    │   ├── bettingApi.ts ← 投注平台 API
    │   ├── worldcupApi.ts← 积分榜 API
    │   ├── analytics.ts  ← 分析逻辑
    │   ├── matchResult.ts
    │   ├── groupStandings.ts
    │   └── bracketResolver.ts
    ├── types/            ← 类型定义
    └── data/             ← 赛程数据（init 后生成）
```

## 测试

```bash
npx vitest run   # 93/93 通过
```

## 技术栈

- TypeScript + Node.js CLI
- 零依赖（tsx/vitest 通过 npx 自动获取）
- 纯 JSON 存储（data/ 目录）
- vitest 单元测试 + CLI 集成测试
- 投注平台 API 集成（yhnm381.com）

## 分发

```bash
# 打包（排除测试产物和数据）
cd G:\Documents\skills
tar -czf wc26.zip --exclude="node_modules" --exclude=".test-tmp" --exclude="data" wc26/
```

## 注意事项

1. **世界杯已开赛**：6月11日开赛，每天有比赛，需及时更新比分
2. **结算时机**：比赛结束后立即执行 `check-and-notify`
3. **API 环境变量**：`WC26_API_BASE` 需要设置才能查看赔率
4. **PowerShell 批量导入**：用 `--file`，不要用 `--text`（会截断）
5. **积分榜缓存**：30 分钟自动刷新，`fetch-standings` 强制刷新

## 记忆迁移

将以下文件复制到工作机相同路径：

```
源: C:\Users\JY806\.local\share\mimocode\memory\projects\global\MEMORY.md
目标: C:\Users\<用户名>\.local\share\mimocode\memory\projects\global\MEMORY.md

源: C:\Users\JY806\.local\share\mimocode\memory\global\MEMORY.md
目标: C:\Users\<用户名>\.local\share\mimocode\memory\global\MEMORY.md
```

## 定时提醒建议

在工作环境设置以下定时任务：

| 时间 | 任务 | 命令 |
|:-----|:-----|:-----|
| 每天 23:00 | 结算当日比赛 | `check-and-notify` |
| 每天 23:30 | 查看盈亏 | `analytics --days 1` |
| 每轮比赛后 | 更新积分榜 | `fetch-standings` |

---

*更新于 2026-06-12*
