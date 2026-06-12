# WC26 世界杯投注账本

> 朋友间世界杯娱乐，说一句话就记上。

[![Tests](https://img.shields.io/badge/tests-93%2F93-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.4-blue)]()
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

## 项目简介

WC26 是一个零依赖的对话式世界杯投注账本 CLI 工具。通过自然语言交互完成下注、结算、盈亏统计等操作。

**核心特性**：
- 🎯 对话式操作——说一句话就能记账
- ⚡ 自动结算——比分更新后自动计算盈亏
- 📊 实时赔率——集成投注平台 API 获取实时赔率
- 📈 数据分析——多日盈亏趋势、玩法统计、连胜连败追踪
- 🔒 零依赖——无需安装任何依赖，npx tsx 直接运行

## 使用场景

1. **朋友群娱乐**——"记一笔：韩国 vs 捷克，韩国赢，赔率 2.5，下注 100"
2. **比分更新自动算账**——"韩国 2 - 1 捷克" → 自动结算所有相关注单
3. **查看实时赔率**——"看看韩国赔率" → 获取最新赔率信息
4. **分析盈亏**——"看看账本" → 净收益、ROI、胜率一目了然
5. **追踪投注趋势**——"分析最近 7 天" → 查看每日盈亏变化

## 功能特性

### 投注管理
- 支持 5 种玩法：胜平负(1X2)、让球、大小球、波胆、自定义
- 支持队名自动匹配（如 `"韩国 vs 捷克"` 自动查找比赛）
- 已结束比赛下注时自动结算
- 批量导入下注记录

### 比赛数据
- 104 场世界杯比赛数据（含小组赛 + 淘汰赛）
- 实时积分榜（自动从 API 刷新）
- 淘汰赛对阵 + 预测功能

### 数据分析
- 每日盈亏统计
- 按玩法分类统计
- 连胜/连败追踪
- ASCII 趋势图可视化

### 投注平台集成
- 实时赔率获取
- 让球盘、大小球、独赢盘口展示
- 比赛详情查看

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/jinyue806/world-cup-2026.git
cd world-cup-2026

# 初始化（可选，npx tsx 会自动处理依赖）
npx tsx src/cli.ts init
```

### 基本使用

```bash
# 设置初始金额
npx tsx src/cli.ts deposit 500

# 下注（支持队名自动匹配）
npx tsx src/cli.ts add-bet --match "韩国 vs 捷克" --type 1X2 --selection 韩国 --odds 2.5 --stake 100

# 更新比分（自动结算）
npx tsx src/cli.ts update-match --match match_6 --score-a 2 --score-b 1

# 查看盈亏
npx tsx src/cli.ts query

# 查看实时赔率
npx tsx src/cli.ts odds

# 数据分析
npx tsx src/cli.ts analytics
```

## 完整命令列表

| 命令 | 说明 |
|:-----|:-----|
| `init` | 初始化赛程数据 |
| `add-bet` | 添加注单 |
| `delete-bet` | 删除注单 |
| `update-match` | 更新比分 |
| `settle` | 手动结算 |
| `status` | 查看比赛状态 |
| `status --summary` | 精简状态（注单+即将开赛） |
| `query` | 查看盈亏统计 |
| `list-bets` | 列出注单 |
| `list-matches` | 列出比赛 |
| `odds` | 查看实时赔率 |
| `odds --detail` | 详细赔率 |
| `analytics` | 数据分析报告 |
| `analytics --days 7` | 最近 7 天分析 |
| `standings` | 查看积分榜 |
| `fetch-standings` | 刷新积分榜 |
| `import-bets` | 批量导入 |
| `check-and-notify` | 定时结算+通知 |
| `bracket` | 淘汰赛对阵 |
| `deposit` | 设置初始金额 |
| `reset` | 重置数据 |
| `help` | 显示帮助 |

## 技术栈

- **语言**：TypeScript
- **运行时**：Node.js >= 18
- **测试**：Vitest（93 个测试用例）
- **依赖**：零依赖（tsx/vitest 通过 npx 自动获取）
- **存储**：纯本地 JSON 文件
- **API**：投注平台实时赔率（可选）

## 项目结构

```
world-cup-2026/
├── SKILL.md              # AI 指令文件
├── README.md             # 本文件
├── LICENSE               # MIT 许可证
├── package.json          # 项目配置
├── references/
│   ├── commands.md       # 完整命令参考
│   ├── bet-rules.md      # 结算规则
│   └── help.txt          # 帮助文本
└── src/
    ├── cli.ts            # CLI 路由
    ├── commands/          # 命令实现（7 个模块）
    │   ├── bet.ts        # 下注/删除/导入
    │   ├── match.ts      # 比分/状态/列表
    │   ├── query.ts      # 盈亏/积分榜
    │   ├── bracket.ts    # 淘汰赛
    │   ├── admin.ts      # 初始化/重置/结算
    │   ├── odds.ts       # 实时赔率
    │   └── analytics.ts  # 数据分析
    ├── lib/              # 核心逻辑（8 个模块）
    │   ├── storage.ts    # JSON 存储
    │   ├── settler.ts    # 结算逻辑
    │   ├── parser.ts     # 文本解析
    │   ├── bettingApi.ts # 投注平台 API
    │   ├── worldcupApi.ts# 积分榜 API
    │   ├── analytics.ts  # 分析逻辑
    │   ├── matchResult.ts
    │   ├── groupStandings.ts
    │   └── bracketResolver.ts
    ├── types/            # TypeScript 类型定义
    └── data/             # 赛程数据（init 后生成）
```

## 测试

```bash
# 运行所有测试
npx vitest run

# 运行特定测试
npx vitest run src/lib/bettingApi.test.ts
```

## 配置

### 投注平台 API（可选）

设置环境变量以启用实时赔率功能：

```bash
# Windows
set WC26_API_BASE=<your-api-endpoint>

# macOS/Linux
export WC26_API_BASE=<your-api-endpoint>
```

### 飞书通知（可选）

如需发送结算通知到飞书群：

```bash
# 安装 lark-cli
npm install -g @larksuite/cli

# 授权
lark-cli auth login --recommend

# 设置群 ID
set ZDW_FEISHU_GROUP_ID=oc_xxxxxxxxxxxxx
```

## 开发指南

### 代码规范

```bash
# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化
npm run format
```

### 添加新命令

1. 在 `src/commands/` 下创建新文件
2. 实现命令逻辑
3. 在 `src/cli.ts` 中注册路由
4. 添加测试用例
5. 更新 `references/commands.md`

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## ⚠️ 免责声明

### 使用性质

**本项目仅供个人娱乐和学习用途，不构成任何投注建议或推荐。**

1. **娱乐性质**：本工具设计用于朋友间小规模娱乐活动，旨在提供便捷的记账和结算功能。

2. **风险自担**：使用本工具进行的任何投注行为，风险由用户自行承担。开发者不对任何投注损失负责。

3. **理性娱乐**：请理性对待，量力而行，切勿沉迷。如遇相关问题，请寻求专业帮助。

4. **合法性**：请遵守当地法律法规。在某些地区，相关活动可能受到法律限制。用户需自行确保使用本工具的合法性。

5. **数据准确性**：本工具提供的赔率数据来自第三方 API，可能存在延迟或误差。请以官方数据为准。

6. **无担保**：本软件按"现状"提供，不作任何明示或暗示的保证。开发者不对因使用本软件而导致的任何损失负责。

### 第三方服务

- **积分榜数据**：来自第三方世界杯数据 API
- **实时赔率**：来自投注平台 API（需用户自行配置）
- **飞书通知**：使用 lark-cli（需用户自行安装和授权）

### 使用建议

- 仅用于朋友间小规模娱乐
- 设置合理的投注上限
- 定期查看盈亏分析，理性调整策略
- 如发现异常，请立即停止使用并检查数据

---

**记住：娱乐为主，理性参与！** ⚽
