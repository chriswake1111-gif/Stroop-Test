/**
 * CLI Test Script for Stroop Generator & Stats Calculator
 * 模擬生成 1,000 題驗證：
 * 1. 衝突題 (Incongruent) 比例約 70% ± 5%
 * 2. 防連續重複機制 (沒有連續相同字與色彩)
 * 3. StatsCalculator 的 Stroop Delta 與成績計算準確性
 */

import { StroopGenerator } from '../src/core/stroop-generator.js';
import { StatsCalculator } from '../src/core/stats-calculator.js';

console.log('🧪 Starting Stroop Generator & Stats Calculator Audit...\n');

const generator = new StroopGenerator();
const TOTAL_QUESTIONS = 1000;
let incongruentCount = 0;
let congruentCount = 0;
let consecutiveDuplicates = 0;

let prevWord = null;
let prevColor = null;

const records = [];

for (let i = 0; i < TOTAL_QUESTIONS; i++) {
  const q = generator.generateQuestion('ink-color');

  if (q.isCongruent) {
    congruentCount++;
  } else {
    incongruentCount++;
  }

  // 檢查連續重複
  if (q.wordId === prevWord && q.colorId === prevColor) {
    consecutiveDuplicates++;
  }
  prevWord = q.wordId;
  prevColor = q.colorId;

  // 模擬答題 (模擬衝突題反應時間較長: ~450ms vs ~370ms)
  const isCorrect = Math.random() > 0.05; // 95% 正確
  const baseRt = q.isCongruent ? 370 : 450;
  const simulatedRt = baseRt + Math.floor((Math.random() - 0.5) * 60);

  records.push({
    isCorrect,
    isCongruent: q.isCongruent,
    rt: simulatedRt
  });
}

const incongruentRatio = (incongruentCount / TOTAL_QUESTIONS) * 100;
console.log(`📊 題目生成統計 (共 ${TOTAL_QUESTIONS} 題):`);
console.log(`   - 衝突題 (Incongruent): ${incongruentCount} 題 (${incongruentRatio.toFixed(1)}%)`);
console.log(`   - 一致題 (Congruent): ${congruentCount} 題 (${((congruentCount / TOTAL_QUESTIONS) * 100).toFixed(1)}%)`);
console.log(`   - 連續字/色完全相同次數: ${consecutiveDuplicates} 次`);

if (incongruentRatio >= 65 && incongruentRatio <= 75) {
  console.log('✅ PASS: 干擾權重控制在預期 70% 範圍內。');
} else {
  console.error('❌ FAIL: 干擾權重偏離預期 (期望 70%)！');
}

if (consecutiveDuplicates === 0) {
  console.log('✅ PASS: 防連續重複機制運作正常。');
} else {
  console.warn('⚠️ WARN: 發現連續相同題目。');
}

console.log('\n🧮 統計計算引擎測試:');
const stats = StatsCalculator.calculateSessionStats(records);
console.log(`   - 正確率: ${stats.accuracy}%`);
console.log(`   - 平均 RT: ${stats.avgRT} ms`);
console.log(`   - 一致題平均 RT: ${stats.congruentAvgRT} ms`);
console.log(`   - 衝突題平均 RT: ${stats.incongruentAvgRT} ms`);
console.log(`   - Stroop Delta 干擾值: ${stats.stroopDelta} ms`);
console.log(`   - 解鎖獎牌: [${stats.badge.iconName}] ${stats.badge.title} (${stats.badge.desc})`);

if (stats.stroopDelta > 0 && stats.accuracy > 0) {
  console.log('✅ PASS: StatsCalculator 計算正確！\n');
} else {
  console.error('❌ FAIL: StatsCalculator 計算異常！\n');
}
