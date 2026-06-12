# WC26 世界杯投注账本

> 朋友间世界杯赌球，说一句话就记上。

[![Tests](https://img.shields.io/badge/tests-64%2F64-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/typescript-5.4-blue)]()
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)]()

## 你什么时候需要它？

1. **朋友群赌球**——"记一笔：韩国 vs 捷克，韩国赢，赔率 2.5，下注 100"
2. **比分更新自动算账**——"韩国 2 - 1 捷克" → 自动结算所有相关注单
3. **看盈亏**——"看看账本" → 净收益、ROI、胜率一目了然

## 它会交付什么？

- 注单管理（5 种玩法：胜平负/让球/大小球/波胆/自定义）
- 比分更新后自动结算
- 盈亏统计 + ROI
- 积分榜（自动从 API 刷新）
- 淘汰赛对阵 + 预测
- 通知文件 `data/notify.json`（供其他 Agent 读取发消息）

## 快速开始

```bash
cd wc26
npx tsx src/cli.ts init
```

完成。104 场比赛已加载，可以开始下注。

## 触发方式

对 AI 说：
- "记一笔：韩国 vs 捷克，韩国赢，赔率 2.5，下注 100"
- "我先放 500 块进去"
- "韩国 2 - 1 捷克"
- "看看盈亏"
- "看看 A 组积分榜"
- "我把下注记录贴给你" → 保存到文件后 `npx tsx src/cli.ts import-bets --file bets.txt`

## 示例

```
> npx tsx src/cli.ts deposit 500
✅ 已存入 500，当前初始金额: 500

> npx tsx src/cli.ts add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2.5 --stake 100
✅ 注单已添加
   比赛: 韩国 vs 捷克 (Group A)
   玩法: 1X2 | 选项: Korea | 赔率: 2.5 | 金额: 100
   状态: pending
   注单ID: bet_a1b2c3d4e5f6g7h8

> npx tsx src/cli.ts update-match --match match_6 --score-a 2 --score-b 1
✅ 比分已更新: 韩国 2 - 1 捷克
   🎯 自动结算了 1 注注单

> npx tsx src/cli.ts query

💰 盈亏统计
   初始金额: 500
   净收益: +150.00
   当前余额: 650.00
   ROI: +150.0%
   胜率: 100.0%
   总注数: 1
```

## 它和同类有什么不同？

| 特性 | wc26 | kicktipp-agent | GoalMine | edgefinder |
|---|---|---|---|---|
| 零依赖 | ✅ | ❌ | ❌ | ❌ |
| 对话式 | ✅ | ✅ MCP | WhatsApp | ✅ MCP |
| 自动结算 | ✅ | ❌ | ❌ | ❌ |
| 盈亏追踪 | ✅ | ❌ | ❌ | ❌ |
| 通用账本 | ✅ | ❌ 平台绑定 | ❌ | ❌ |
| 世界杯聚焦 | ✅ | ❌ | ✅ | ❌ |

## 安全边界

- 不会联网调用外部 API（积分榜自动刷新有 30 分钟缓存，失败时静默回退）
- 不会删除用户数据（`reset` 命令需要 `--confirm true`）
- 不会泄露任何信息（纯本地 JSON 存储）

## 文件结构

```
wc26/
├── SKILL.md              ← AI 指令（给 Agent 看的）
├── README.md             ← 人类入口（给你看的）
├── package.json
├── references/
│   ├── commands.md       ← 完整命令参考
│   └── bet-rules.md      ← 结算规则
└── src/
    ├── cli.ts            ← CLI 路由
    ├── commands/          ← 命令实现
    ├── lib/              ← 核心逻辑
    ├── types/            ← 类型定义
    └── data/             ← 赛程数据
```

## 验证与测试

```bash
npx vitest run   # 64/64 通过
```

## License

MIT
