# WC26 世界杯投注账本

> 朋友间世界杯娱乐，说一句话就记上。

[![Tests](https://img.shields.io/badge/tests-93%2F93-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.4-blue)]()
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

## 项目简介

WC26 是一个零依赖的世界杯投注账本。支持对话式交互（OpenClaw/QQ Bot）和命令行（CLI）两种使用方式。

**核心特性**：
- 🎯 对话式操作——说一句话就能记账
- ⚡ 自动结算——比分更新后自动计算盈亏
- 📊 实时赔率——集成投注平台 API 获取实时赔率
- 📈 数据分析——多日盈亏趋势、玩法统计、连胜连败追踪
- 🔒 零依赖——无需安装任何依赖，npx tsx 直接运行

## 快速开始

### 方式一：对话式（推荐）

通过 OpenClaw/QQ Bot 直接对话：

1. 安装 skill：
```bash
clawhub install wc26
```

2. 在 QQ Bot 中说话：
- "记一笔：韩国 vs 捷克，韩国赢，赔率 2.5，下注 100"
- "韩国 2 - 1 捷克"
- "看看盈亏"
- "分析最近 7 天"

### 方式二：命令行（备选）

```bash
# 克隆仓库
git clone https://github.com/jinyue806/world-cup-2026.git
cd world-cup-2026

# 初始化
npx tsx src/cli.ts init

# 下注
npx tsx src/cli.ts add-bet --match "韩国 vs 捷克" --type 1X2 --selection 韩国 --odds 2.5 --stake 100
```

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

## 技术栈

- **语言**：TypeScript
- **运行时**：Node.js >= 18
- **测试**：Vitest（93 个测试用例）
- **依赖**：零依赖（tsx/vitest 通过 npx 自动获取）
- **存储**：纯本地 JSON 文件

## 项目结构

```
world-cup-2026/
├── SKILL.md              # AI 指令文件
├── README.md             # 本文件
├── LICENSE               # MIT 许可证
├── package.json          # 项目配置
├── references/
│   ├── commands.md       # 完整命令参考（CLI 用户）
│   ├── bet-rules.md      # 结算规则
│   └── help.txt          # 帮助文本
└── src/
    ├── cli.ts            # CLI 路由
    ├── commands/          # 命令实现
    ├── lib/              # 核心逻辑
    ├── types/            # TypeScript 类型定义
    └── data/             # 赛程数据（init 后生成）
```

## 测试

```bash
npx vitest run
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

## 开发指南

### 代码规范

```bash
npm run lint      # 代码检查
npm run format    # 格式化
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
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## ⚠️ 免责声明

**本项目仅供个人娱乐和学习用途，不构成任何投注建议或推荐。**

1. **娱乐性质**：本工具设计用于朋友间小规模娱乐活动，旨在提供便捷的记账和结算功能。

2. **风险自担**：使用本工具进行的任何投注行为，风险由用户自行承担。开发者不对任何投注损失负责。

3. **理性娱乐**：请理性对待，量力而行，切勿沉迷。

4. **合法性**：请遵守当地法律法规。用户需自行确保使用本工具的合法性。

5. **无担保**：本软件按"现状"提供，不作任何明示或暗示的保证。

**记住：娱乐为主，理性参与！** ⚽
