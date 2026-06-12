import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLI = path.resolve(__dirname, 'cli.ts');
const TMP_DIR = path.join(__dirname, '..', '.test-tmp');

function run(cmd: string): string {
  return execSync(`npx tsx ${CLI} ${cmd}`, {
    cwd: TMP_DIR,
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

function runFail(cmd: string): string {
  try {
    run(cmd);
    throw new Error('Expected command to fail');
  } catch (e: any) {
    return (e.stderr || '') + (e.stdout || '');
  }
}

function dataFile(name: string): string {
  return path.join(TMP_DIR, 'data', name);
}

function readJson(name: string): any {
  return JSON.parse(fs.readFileSync(dataFile(name), 'utf-8'));
}

beforeAll(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(path.join(TMP_DIR, 'data'), { recursive: true });
});

afterAll(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  fs.rmSync(path.join(TMP_DIR, 'data'), { recursive: true, force: true });
  fs.mkdirSync(path.join(TMP_DIR, 'data'), { recursive: true });
  run('init');
}, 30000);

describe('init', () => {
  it('loads matches', () => {
    const matches = readJson('matches.json');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('creates predictions.json', () => {
    expect(fs.existsSync(dataFile('predictions.json'))).toBe(true);
  });
}, 30000);

describe('deposit', () => {
  it('sets initial deposit', () => {
    const out = run('deposit 500');
    expect(out).toContain('500');
  });
}, 30000);

describe('add-bet', () => {
  it('adds a 1X2 bet and stores selection', () => {
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2.5 --stake 100');
    const bets = readJson('bets.json');
    expect(bets.length).toBe(1);
    expect(bets[0].betType).toBe('1X2');
    expect(bets[0].odds).toBe(2.5);
    expect(bets[0].stake).toBe(100);
    expect(bets[0].status).toBe('pending');
  });

  it('auto-settles on finished match', () => {
    run('update-match --match match_6 --score-a 2 --score-b 1');
    const out = run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 50');
    expect(out).toContain('已赢');
  });

  it('fails with missing args', () => {
    const out = runFail('add-bet --match match_6');
    expect(out).toContain('用法');
  });

  it('fails with invalid match', () => {
    const out = runFail('add-bet --match match_999 --type 1X2 --selection A --odds 2 --stake 100');
    expect(out).toContain('找不到比赛');
  });
}, 60000);

describe('update-match', () => {
  it('updates score and persists', () => {
    run('update-match --match match_6 --score-a 2 --score-b 1');
    const matches = readJson('matches.json');
    const m = matches.find((m: any) => m.id === 'match_6');
    expect(m.scoreA).toBe(2);
    expect(m.scoreB).toBe(1);
    expect(m.status).toBe('finished');
  });

  it('auto-settles pending bets', () => {
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 100');
    const out = run('update-match --match match_6 --score-a 2 --score-b 1');
    expect(out).toContain('自动结算');
    const bets = readJson('bets.json');
    expect(bets[0].status).toBe('won');
  });

  it('fails with negative score', () => {
    const out = runFail('update-match --match match_6 --score-a -1 --score-b 0');
    expect(out).toContain('不能为负数');
  });
}, 60000);

describe('list-bets', () => {
  it('shows empty when no bets', () => {
    const out = run('list-bets');
    expect(out).toContain('没有找到注单');
  });

  it('lists bets after adding', () => {
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 100');
    const out = run('list-bets');
    expect(out).toContain('注单列表');
    expect(out).toContain('1X2');
  });
}, 60000);

describe('delete-bet', () => {
  it('deletes a bet by id', () => {
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 100');
    const bets = readJson('bets.json');
    const out = run(`delete-bet --id ${bets[0].id}`);
    expect(out).toContain('已删除');
    expect(readJson('bets.json').length).toBe(0);
  });

  it('fails with invalid id', () => {
    const out = runFail('delete-bet --id bet_nonexistent');
    expect(out).toContain('找不到注单');
  });
}, 60000);

describe('query', () => {
  it('shows zero stats with no bets', () => {
    const out = run('query');
    expect(out).toContain('盈亏统计');
    expect(out).toContain('总注数: 0');
  });

  it('calculates profit correctly', () => {
    run('deposit 500');
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 100');
    run('update-match --match match_6 --score-a 2 --score-b 1');
    const out = run('query');
    expect(out).toContain('净收益: +100.00');
    expect(out).toContain('收益率: +100.0%');
  });

  it('calculates loss correctly', () => {
    run('deposit 500');
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 100');
    run('update-match --match match_6 --score-a 0 --score-b 2');
    const out = run('query');
    expect(out).toContain('净收益: -100.00');
  });
}, 90000);

describe('standings', () => {
  it('shows group standings', () => {
    const out = run('standings --group "Group A"');
    expect(out).toContain('积分榜');
  });

  it('fails without group arg', () => {
    const out = runFail('standings');
    expect(out).toContain('用法');
  });
}, 60000);

describe('bracket + predictions', () => {
  it('shows bracket', () => {
    const out = run('bracket');
    expect(out).toContain('Round of 32');
  });

  it('shows predictions', () => {
    const out = run('predictions');
    expect(out).toContain('小组赛预测');
  });

  it('set-group-standings works', () => {
    run('set-group-standings --group "Group A" --teams "Mexico,South Korea,Czech Republic,South Africa"');
    const p = readJson('predictions.json');
    expect(p.groupStandings['Group A']).toEqual(['Mexico', 'South Korea', 'Czech Republic', 'South Africa']);
  });

  it('set-bracket works', () => {
    run('set-bracket --match match_73 --winner "Mexico"');
    const p = readJson('predictions.json');
    expect(p.bracket['match_73']).toBe('Mexico');
  });
}, 90000);

describe('import-bets', () => {
  it('imports from file', () => {
    const betsFile = path.join(TMP_DIR, 'test-bets.txt');
    fs.writeFileSync(betsFile, '韩国 v 捷克 足球波胆 1-2@11.0 投注金额:100.00\n韩国 v 捷克 足球独赢 和局@3.05 投注金额:200.00\n');
    const out = run(`import-bets --file ${betsFile}`);
    expect(out).toContain('导入完成');
    expect(out).toContain('2 注成功');
    const bets = readJson('bets.json');
    expect(bets.length).toBe(2);
  });

  it('skips unmatched teams', () => {
    const betsFile = path.join(TMP_DIR, 'test-bets.txt');
    fs.writeFileSync(betsFile, '火星 v 木星 足球独赢 火星@2.0 投注金额:100.00\n');
    const out = run(`import-bets --file ${betsFile}`);
    expect(out).toContain('跳过');
  });
}, 60000);

describe('check-and-notify', () => {
  it('generates notify.json for finished matches', () => {
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 100');
    run('update-match --match match_6 --score-a 2 --score-b 1');
    const out = run('check-and-notify');
    expect(out).toContain('通知已写入');
    const notify = readJson('notify.json');
    expect(notify.settled.length).toBe(1);
    expect(notify.settled[0].result).toBe('won');
  });
}, 60000);

describe('reset', () => {
  it('resets with --confirm', () => {
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 100');
    const out = run('reset --confirm true');
    expect(out).toContain('已重置');
    expect(readJson('bets.json').length).toBe(0);
  });
}, 30000);

describe('full integration', () => {
  it('deposit → import → update → query → notify', () => {
    run('deposit 500');

    const betsFile = path.join(TMP_DIR, 'test-bets.txt');
    fs.writeFileSync(betsFile, '韩国 v 捷克 足球波胆 1-2@11.0 投注金额:100.00\n墨西哥 v 南非 足球独赢 墨西哥@1.8 投注金额:100.00\n');
    run(`import-bets --file ${betsFile}`);

    run('update-match --match match_6 --score-a 1 --score-b 2');
    run('update-match --match match_1 --score-a 1 --score-b 0');

    const bets = readJson('bets.json');
    expect(bets.every((b: any) => b.status !== 'pending')).toBe(true);

    const out = run('query');
    expect(out).toContain('净收益: +1080.00');

    const notifyOut = run('check-and-notify');
    expect(notifyOut).toContain('通知已写入');
    const notify = readJson('notify.json');
    expect(notify.settled.length).toBe(2);
  });

  it('multiple bets on same match settle correctly', () => {
    run('deposit 500');
    run('add-bet --match match_6 --type 1X2 --selection 韩国 --odds 2 --stake 100');
    run('add-bet --match match_6 --type 1X2 --selection 捷克 --odds 3 --stake 50');
    run('update-match --match match_6 --score-a 2 --score-b 1');
    const bets = readJson('bets.json');
    expect(bets[0].status).toBe('won');
    expect(bets[1].status).toBe('lost');
    const out = run('query');
    expect(out).toContain('净收益: +50.00');
  });
}, 120000);

describe('help', () => {
  it('shows help text', () => {
    const out = run('help');
    expect(out).toContain('2026世界杯');
    expect(out).toContain('add-bet');
    expect(out).toContain('update-match');
  });
}, 30000);
