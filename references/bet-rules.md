# 结算规则

## 1X2（胜平负）

- **选主队/A 队**（`1` / 主胜）：scoreA > scoreB → 赢
- **选客队/B 队**（`2` / 客胜）：scoreA < scoreB → 赢
- **选平**（`X` / 平）：scoreA === scoreB → 赢
- 其他情况 → 输

支持中文选项：主胜、客胜、平。

## 让球（Handicap）

公式：`scoreA + handicapValue` vs `scoreB`

- **选主队**：`(scoreA + handicapValue) > scoreB` → 赢；`= 走盘(void)`；`< 输`
- **选客队**：`(scoreB + handicapValue) > scoreA` → 赢；`= 走盘(void)`；`< 输`

示例：主队让 1.5 球（`--handicap -1.5`），实际比分 2-1 → `2 + (-1.5) = 0.5 < 1` → 输。

## 大小球（Over/Under）

公式：`totalGoals = scoreA + scoreB`

- **大球**（`Over` / 大 / 大球）：`totalGoals > threshold` → 赢；`< 输`；`= 走盘(void)`
- **小球**（`Under` / 小 / 小球）：`totalGoals < threshold` → 赢；`> 输`；`= 走盘(void)`

示例：大小球 2.5（`--threshold 2.5`），比分 2-1 → 总进球 3 > 2.5 → 大球赢。

## 波胆（Correct Score）

精确匹配比分。支持格式：`2-1`、`1:0`、`2 – 1`（自动去除空格和分隔符）。

- 匹配 → 赢
- 不匹配 → 输

## 自定义（Custom）

不自动结算。用户手动更新注单状态。

## 通用规则

- 比赛未结束 → 注单保持 pending
- 走盘（void）→ 不赢不输，退还本金
- 比分更新后自动重新结算所有受影响注单
- 淘汰赛平局需提供 `--winner` 参数（点球/加时胜者）
