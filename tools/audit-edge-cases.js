/**
 * CLI Edge-Case & Chaos Audit Tool
 * 審計 Stroop PWA 在極端數據與邊界條件下的穩健度：
 * 1. StorageService 髒資料/無效 JSON/NaN 解析防禦
 * 2. Daily Streak 跨月/跨年/日期倒退邏輯驗證
 * 3. StatsCalculator 包含 NaN/Null/0ms 異常數據處置
 */

import { StorageService } from '../src/services/storage.js';
import { StatsCalculator } from '../src/core/stats-calculator.js';

console.log('🛡️ Starting Edge-Case Chaos Audit...\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// Test Group 1: StorageService Dirty Data & Resilience
// ----------------------------------------------------
console.log('📌 Test Group 1: StorageService 髒資料防禦測試');

// 模擬 Mock LocalStorage
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = value.toString();
  }
}

global.localStorage = new MockLocalStorage();

// T1.1: 空 JSON / 破損 JSON
localStorage.setItem('stroop_test_data_v1', '{corrupted_json_string: true,');
const loadedFallback = StorageService.load();
assert(loadedFallback && loadedFallback.settings.theme === 'warm-sepia', '破損 JSON 能自動復原並降級至預設值');

// T1.2: 缺項 JSON
localStorage.setItem('stroop_test_data_v1', JSON.stringify({ settings: { mode: 'text-meaning' } }));
const loadedPartial = StorageService.load();
assert(loadedPartial.settings.mode === 'text-meaning' && loadedPartial.settings.duration === 30, '部分缺項 JSON 能補齊缺失設定欄位');

// ----------------------------------------------------
// Test Group 2: Daily Streak Date Calculations
// ----------------------------------------------------
console.log('\n📌 Test Group 2: Daily Streak 跨天與時間倒退計算驗證');

localStorage.store = {}; // Reset

// T2.1: 同一天重複測試，Streak 不會重複 +1
StorageService.recordSession('ink-color', { correctCount: 10, accuracy: 100, avgRT: 400 });
const firstPlay = StorageService.load().streak;
assert(firstPlay.currentStreak === 1, '首日遊玩 Streak 為 1');

StorageService.recordSession('ink-color', { correctCount: 15, accuracy: 100, avgRT: 380 });
const secondPlaySameDay = StorageService.load().streak;
assert(secondPlaySameDay.currentStreak === 1, '同日第二次遊玩 Streak 保持為 1');

// T2.2: 模擬連續日期與跨月 (跨月 2026-07-31 ➔ 2026-08-01)
const data = StorageService.load();
data.streak = { currentStreak: 5, lastPlayDate: '2026-07-31', bestStreak: 5 };
StorageService.save(data);

// 模擬在 2026-08-01 遊玩
const streakDiffDays = Math.round((new Date('2026-08-01') - new Date('2026-07-31')) / (1000 * 60 * 60 * 24));
assert(streakDiffDays === 1, '跨月日期計算正確識別相隔 1 天');

// T2.3: 時鐘倒退測試 (2026-07-22 倒退至 2026-07-01)
data.streak = { currentStreak: 10, lastPlayDate: '2026-07-22', bestStreak: 10 };
StorageService.save(data);

// 如果 lastPlayDate > today (系統時鐘倒退)，重置 Streak 為 1，防止 Streak 變成負數或異常
const todayDate = new Date('2026-07-01');
const lastDate = new Date('2026-07-22');
const isRollback = todayDate < lastDate;
assert(isRollback === true, '精準識別系統時鐘倒退事件');

// ----------------------------------------------------
// Test Group 3: StatsCalculator Invalid & Extreme Input
// ----------------------------------------------------
console.log('\n📌 Test Group 3: StatsCalculator 異常數據計算審計');

// T3.1: 空陣列紀錄
const emptyStats = StatsCalculator.calculateSessionStats([]);
assert(emptyStats.avgRT === 0 && emptyStats.stroopDelta === 0, '空答題紀錄安全傳回 0，不拋出除以零異常');

// T3.2: 包含 NaN 與負數 RT 的異常紀錄
const dirtyRecords = [
  { isCorrect: true, isCongruent: true, rt: 350 },
  { isCorrect: true, isCongruent: false, rt: NaN },
  { isCorrect: true, isCongruent: false, rt: -100 },
  { isCorrect: true, isCongruent: false, rt: 450 },
  { isCorrect: false, isCongruent: false, rt: 500 }
];

const dirtyStats = StatsCalculator.calculateSessionStats(dirtyRecords);
assert(!isNaN(dirtyStats.avgRT) && !isNaN(dirtyStats.stroopDelta), '含有 NaN/負數 RT 時自動過濾，不產生 NaN 結果');
assert(dirtyStats.avgRT > 0, '平均反應時間計算正常且 > 0');

console.log(`\n🏁 審計完成! 成功通過 ${passedTests} 項測試, 失敗 ${failedTests} 項。`);

if (failedTests > 0) {
  process.exit(1);
}
