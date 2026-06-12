# WC26 世界杯投注账本 — 交接文档

**日期**: 2026-06-12
**项目**: 零依赖对话式世界杯投注 CLI
**状态**: 世界杯进行中（6月11日开赛），需每日维护

---

## 定时任务

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
```

### 关键时间点
- **小组赛**: 6月11日-6月27日（每天有比赛）
- **淘汰赛**: 6月29日-7月15日
- **决赛**: 7月19日

## API 配置

设置环境变量以启用实时赔率：

```bash
# Windows
set WC26_API_BASE=<your-api-endpoint>

# macOS/Linux
export WC26_API_BASE=<your-api-endpoint>
```

## 注意事项

1. **结算时机**：比赛结束后立即执行 `check-and-notify`
2. **PowerShell 批量导入**：用 `--file`，不要用 `--text`（会截断）
3. **积分榜缓存**：30 分钟自动刷新，`fetch-standings` 强制刷新

## 定时提醒建议

| 时间 | 任务 | 命令 |
|:-----|:-----|:-----|
| 每天 23:00 | 结算当日比赛 | `check-and-notify` |
| 每天 23:30 | 查看盈亏 | `analytics --days 1` |
| 每轮比赛后 | 更新积分榜 | `fetch-standings` |

---

*更新于 2026-06-12*
