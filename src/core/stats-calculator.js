/**
 * Stats Calculator Module
 * 計算平均反應時間、Stroop 干擾值 (Delta)、正確率與解鎖成就獎牌。
 */

export class StatsCalculator {
  /**
   * 計算單局遊戲數據
   * @param {Array<Object>} records - 答題紀錄陣列 [{ isCorrect, isCongruent, rt }]
   * @returns {Object} 統計結果
   */
  static calculateSessionStats(records) {
    if (!records || records.length === 0) {
      return {
        total: 0,
        correctCount: 0,
        accuracy: 0,
        avgRT: 0,
        congruentAvgRT: 0,
        incongruentAvgRT: 0,
        stroopDelta: 0,
        badge: null
      };
    }

    const total = records.length;
    // 僅統計回答正確且 RT 為有效數字 (>0) 的紀錄
    const correctRecords = records.filter(
      r => r.isCorrect === true && typeof r.rt === 'number' && !isNaN(r.rt) && r.rt > 0
    );
    const correctCount = records.filter(r => r.isCorrect === true).length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // 僅統計回答正確的反應時間 (ms)
    const allRTs = correctRecords.map(r => r.rt);
    const avgRT = allRTs.length > 0 ? Math.round(allRTs.reduce((a, b) => a + b, 0) / allRTs.length) : 0;

    const congruentRTs = correctRecords.filter(r => r.isCongruent).map(r => r.rt);
    const incongruentRTs = correctRecords.filter(r => !r.isCongruent).map(r => r.rt);

    const congruentAvgRT = congruentRTs.length > 0
      ? Math.round(congruentRTs.reduce((a, b) => a + b, 0) / congruentRTs.length)
      : avgRT;

    const incongruentAvgRT = incongruentRTs.length > 0
      ? Math.round(incongruentRTs.reduce((a, b) => a + b, 0) / incongruentRTs.length)
      : avgRT;

    // Stroop Interference Delta = 衝突題平均 RT - 一致題平均 RT
    const stroopDelta = Math.round(incongruentAvgRT - congruentAvgRT);

    // 成就評估
    const badge = this.evaluateBadge({ accuracy, avgRT, stroopDelta, total });

    return {
      total,
      correctCount,
      accuracy,
      avgRT,
      congruentAvgRT,
      incongruentAvgRT,
      stroopDelta,
      badge
    };
  }

  /**
   * 依據表現頒發成就獎牌
   */
  static evaluateBadge({ accuracy, avgRT, stroopDelta, total }) {
    if (total < 5) return { title: '暖身完成', icon: '🌱', desc: '成功踏出第一步！' };

    if (accuracy >= 95 && avgRT > 0 && avgRT <= 450 && stroopDelta <= 50) {
      return { title: '抗干擾大師', icon: '👑', desc: '反應神速且幾乎不受色彩干擾！' };
    }
    if (avgRT > 0 && avgRT <= 420) {
      return { title: '超音速反應', icon: '⚡', desc: '平均反應時間小於 420ms！' };
    }
    if (accuracy >= 95) {
      return { title: '專注絕佳', icon: '🎯', desc: '正確率高達 95% 以上！' };
    }
    if (stroopDelta <= 60 && stroopDelta >= 0) {
      return { title: '冷靜大腦', icon: '🧘', desc: '展現極佳的前額葉抑制能力！' };
    }

    return { title: '持續進步中', icon: '🌟', desc: '每天鍛鍊，大腦越用越靈活！' };
  }
}
