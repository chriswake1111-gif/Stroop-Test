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
StorageService.recordSession('ink-color', { correctCount: 10, accuracy: 100, avgRT: 400 }, new Date('2026-07-22T10:00:00'));
const firstPlay = StorageService.load().streak;
assert(firstPlay.currentStreak === 1, '首日遊玩 Streak 為 1');

StorageService.recordSession('ink-color', { correctCount: 15, accuracy: 100, avgRT: 380 }, new Date('2026-07-22T23:55:00'));
const secondPlaySameDay = StorageService.load().streak;
assert(secondPlaySameDay.currentStreak === 1, '同日第二次遊玩 Streak 保持為 1');

// T2.2: 真實呼叫 recordSession 驗證跨月連續打卡 (2026-07-31 ➔ 2026-08-01)
const data = StorageService.load();
data.streak = { currentStreak: 5, lastPlayDate: '2026-07-31', bestStreak: 5 };
StorageService.save(data);

const crossMonthResult = StorageService.recordSession('ink-color', { correctCount: 12, accuracy: 90, avgRT: 420 }, new Date('2026-08-01T00:05:00'));
assert(crossMonthResult.streak.currentStreak === 6, '跨月 (07-31 ➔ 08-01 凌晨) 真實 recordSession 連續 Streak 正確累加為 6');

// T2.3: 真實呼叫 recordSession 驗證時鐘倒退保護 (2026-08-01 倒退至 2026-07-01)
const rollbackResult = StorageService.recordSession('ink-color', { correctCount: 12, accuracy: 90, avgRT: 420 }, new Date('2026-07-01T12:00:00'));
assert(rollbackResult.streak.currentStreak === 1, '系統時鐘倒退時真實 recordSession 安全重置 Streak 為 1');

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

// T3.3: 全錯 (0% 正確率) 不應頒發「冷靜大腦」獎牌
const allWrongRecords = Array.from({ length: 6 }, () => ({
  isCorrect: false,
  isCongruent: false,
  rt: 400
}));
const allWrongStats = StatsCalculator.calculateSessionStats(allWrongRecords);
assert(allWrongStats.accuracy === 0 && allWrongStats.badge?.title === '再接再厲', '0% 正確率時給予鼓勵獎牌而非「冷靜大腦」');

console.log(`\n🏁 審計完成! 成功通過 ${passedTests} 項測試, 失敗 ${failedTests} 項。`);

if (failedTests > 0) {
  process.exit(1);
}
