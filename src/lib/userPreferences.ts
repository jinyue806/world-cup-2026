/**
 * WC26 用户偏好模块
 *
 * 职责：管理用户的偏好球队设置和 AI 主动拷问模式。
 */

import fs from 'fs';
import path from 'path';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProactiveMode = 'strict' | 'balanced' | 'relaxed' | 'off';

export interface UserPreferences {
  favoriteTeams: string[];
  dislikedTeams: string[];
  proactiveMode: ProactiveMode;
  bettingLimit?: number; // 单注上限（占本金百分比）
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PREFERENCES_PATH = path.join(process.cwd(), 'data', 'preferences.json');
const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteTeams: [],
  dislikedTeams: [],
  proactiveMode: 'balanced',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * 加载用户偏好
 */
export function loadPreferences(): UserPreferences {
  try {
    if (fs.existsSync(PREFERENCES_PATH)) {
      const data = fs.readFileSync(PREFERENCES_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('⚠️ 读取偏好失败:', (e as Error).message);
  }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * 保存用户偏好
 */
export function savePreferences(prefs: UserPreferences): void {
  prefs.updatedAt = new Date().toISOString();
  const tmpPath = `${PREFERENCES_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(prefs, null, 2));
  fs.renameSync(tmpPath, PREFERENCES_PATH);
}

/**
 * 设置 AI 主动拷问模式
 */
export function setProactiveMode(mode: ProactiveMode): void {
  const prefs = loadPreferences();
  prefs.proactiveMode = mode;
  savePreferences(prefs);
}

/**
 * 获取当前 AI 主动拷问模式
 */
export function getProactiveMode(): ProactiveMode {
  const prefs = loadPreferences();
  return prefs.proactiveMode || 'balanced';
}

/**
 * 检查是否应该拷问
 */
export function shouldGrill(context: 'bet' | 'query' | 'recommend' | 'risk' | 'preference' | 'cooling'): boolean {
  const mode = getProactiveMode();
  
  if (mode === 'off') return false;
  
  switch (context) {
    case 'bet':
      return mode === 'strict' || mode === 'balanced';
    case 'query':
      return mode === 'strict';
    case 'recommend':
      return mode === 'strict' || mode === 'balanced';
    case 'risk':
      return mode !== 'off'; // 风险预警始终触发
    case 'preference':
      return mode === 'strict' || mode === 'balanced';
    case 'cooling':
      return mode !== 'off'; // 冷静期始终触发
    default:
      return false;
  }
}

/**
 * 添加偏好球队
 */
export function addFavoriteTeam(team: string): void {
  const prefs = loadPreferences();
  if (!prefs.favoriteTeams.includes(team)) {
    prefs.favoriteTeams.push(team);
    // 从不喜欢列表移除
    prefs.dislikedTeams = prefs.dislikedTeams.filter(t => t !== team);
    savePreferences(prefs);
  }
}

/**
 * 移除偏好球队
 */
export function removeFavoriteTeam(team: string): void {
  const prefs = loadPreferences();
  prefs.favoriteTeams = prefs.favoriteTeams.filter(t => t !== team);
  savePreferences(prefs);
}

/**
 * 添加不喜欢的球队
 */
export function addDislikedTeam(team: string): void {
  const prefs = loadPreferences();
  if (!prefs.dislikedTeams.includes(team)) {
    prefs.dislikedTeams.push(team);
    // 从偏好列表移除
    prefs.favoriteTeams = prefs.favoriteTeams.filter(t => t !== team);
    savePreferences(prefs);
  }
}

/**
 * 移除不喜欢的球队
 */
export function removeDislikedTeam(team: string): void {
  const prefs = loadPreferences();
  prefs.dislikedTeams = prefs.dislikedTeams.filter(t => t !== team);
  savePreferences(prefs);
}

/**
 * 检查球队是否是偏好球队
 */
export function isFavoriteTeam(team: string): boolean {
  const prefs = loadPreferences();
  return prefs.favoriteTeams.includes(team);
}

/**
 * 检查球队是否是不喜欢的球队
 */
export function isDislikedTeam(team: string): boolean {
  const prefs = loadPreferences();
  return prefs.dislikedTeams.includes(team);
}

/**
 * 获取球队权重
 * 偏好球队 +10，不喜欢球队 -5，其他 0
 */
export function getTeamWeight(team: string): number {
  if (isFavoriteTeam(team)) return 10;
  if (isDislikedTeam(team)) return -5;
  return 0;
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatPreferences(prefs: UserPreferences): string {
  const lines: string[] = [];
  
  lines.push('\n⚙️ 用户偏好设置');
  lines.push(`${'─'.repeat(40)}`);
  
  if (prefs.favoriteTeams.length > 0) {
    lines.push(`   偏好球队: ${prefs.favoriteTeams.join(', ')}`);
  } else {
    lines.push('   偏好球队: 未设置');
  }
  
  if (prefs.dislikedTeams.length > 0) {
    lines.push(`   不喜欢: ${prefs.dislikedTeams.join(', ')}`);
  }
  
  const modeNames: Record<ProactiveMode, string> = {
    'strict': '🎯 严格模式',
    'balanced': '⚖️ 平衡模式',
    'relaxed': '😎 轻松模式',
    'off': '🙅 关闭模式',
  };
  lines.push(`   拷问模式: ${modeNames[prefs.proactiveMode]}`);
  
  lines.push(`   更新时间: ${prefs.updatedAt.slice(0, 16)}`);
  
  return lines.join('\n');
}
