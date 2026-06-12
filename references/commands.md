# CLI 命令完整参考

所有命令前缀：`npx tsx src/cli.ts`

## 基础命令

| 命令 | 参数 | 说明 |
|:-----|:-----|:-----|
| `init` | — | 初始化赛程数据（104 场比赛） |
| `help` | — | 显示帮助 |

## 投注管理

| 命令 | 参数 | 说明 |
|:-----|:-----|:-----|
| `deposit` | `<金额>` | 设置初始金额 |
| `add-bet` | `--match --type --selection --odds --stake [--handicap] [--threshold] [--notes]` | 添加注单（已结束比赛自动结算） |
| `delete-bet` | `--id <betId>` | 删除注单 |
| `settle` | — | 手动结算全部（通常不需要） |

### add-bet 玩法参数

| 玩法 | --type | --selection 示例 | 附加参数 |
|:-----|:-------|:-----------------|:---------|
| 胜平负 | `1X2` | 队名 / "平" / "1" / "2" | — |
| 让球 | `handicap` | 队名 / "1" / "2" | `--handicap -1.5` |
| 大小球 | `over_under` | "大" / "小" / "Over" / "Under" | `--threshold 2.5` |
| 波胆 | `correct_score` | "2-1" / "1:0" | — |
| 自定义 | `custom` | 自由文本 | — |

## 比赛管理

| 命令 | 参数 | 说明 |
|:-----|:-----|:-----|
| `update-match` | `--match --score-a --score-b [--winner]` | 更新比分+自动结算 |
| `list-matches` | `[--group] [--status]` | 列出比赛 |
| `status` | `[--group] [--status]` | 查看所有比赛和注单状态 |

## 查询

| 命令 | 参数 | 说明 |
|:-----|:-----|:-----|
| `query` | — | 查看盈亏+ROI |
| `list-bets` | `[--status]` | 列出注单 |
| `standings` | `--group <Group A>` | 查看小组积分榜 |

## 工具

| 命令 | 参数 | 说明 |
|:-----|:-----|:-----|
| `fetch-standings` | — | 从 API 获取最新积分榜 |
| `import-bets` | `--text <文本>` / `--file <path>` | 批量导入下注记录 |
| `check-and-notify` | — | 检查比赛结果+结算+生成通知 |

## 淘汰赛

| 命令 | 参数 | 说明 |
|:-----|:-----|:-----|
| `bracket` | — | 查看淘汰赛对阵 |
| `predictions` | — | 查看预测数据 |
| `set-group-standings` | `--group --teams` | 设置小组赛排名 |
| `set-bracket` | `--match --winner` | 设置淘汰赛预测胜者 |

## 数据管理

| 命令 | 参数 | 说明 |
|:-----|:-----|:-----|
| `reset` | `[--confirm]` | 重置所有数据（需确认） |
