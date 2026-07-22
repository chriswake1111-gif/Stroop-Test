/**
 * Stroop Generator Module
 * 核心題目生成器：包含干擾權重控制（70% 衝突題 / 30% 一致題）與防連續重複機制。
 */

export const COLOR_PALETTE = [
  { id: 'red', name: '紅', hex: '#EF4444' },
  { id: 'blue', name: '藍', hex: '#3B82F6' },
  { id: 'green', name: '綠', hex: '#10B981' },
  { id: 'yellow', name: '黃', hex: '#D97706' },
  { id: 'purple', name: '紫', hex: '#8B5CF6' }
];

export class StroopGenerator {
  constructor(colors = COLOR_PALETTE) {
    this.colors = colors;
    this.lastWord = null;
    this.lastColor = null;
  }

  /**
   * 重置上一題紀錄
   */
  reset() {
    this.lastWord = null;
    this.lastColor = null;
  }

  /**
   * 生成單一題目
   * @param {string} mode - 'ink-color' | 'text-meaning' | 'dual-switch'
   * @returns {Object} { id, wordObj, colorObj, isCongruent, targetRule, correctAnswerId }
   */
  generateQuestion(mode = 'ink-color') {
    const isCongruent = Math.random() >= 0.7; // 30% Congruent, 70% Incongruent

    let wordObj;
    let colorObj;

    // 可選選項庫
    const availableColors = [...this.colors];

    if (isCongruent) {
      // 一致題：字義與顏色相同
      // 避免連續相同字/色
      let filtered = availableColors.filter(
        c => c.id !== this.lastWord && c.id !== this.lastColor
      );
      if (filtered.length === 0) filtered = availableColors;
      
      const chosen = filtered[Math.floor(Math.random() * filtered.length)];
      wordObj = chosen;
      colorObj = chosen;
    } else {
      // 衝突題：字義與顏色不同
      // 1. 選擇字義 (避免上一題的字義)
      let wordCandidates = availableColors.filter(c => c.id !== this.lastWord);
      if (wordCandidates.length === 0) wordCandidates = availableColors;
      wordObj = wordCandidates[Math.floor(Math.random() * wordCandidates.length)];

      // 2. 選擇顏色 (必須與字義不同，且儘量避免上一題的顏色)
      let colorCandidates = availableColors.filter(
        c => c.id !== wordObj.id && c.id !== this.lastColor
      );
      if (colorCandidates.length === 0) {
        colorCandidates = availableColors.filter(c => c.id !== wordObj.id);
      }
      colorObj = colorCandidates[Math.floor(Math.random() * colorCandidates.length)];
    }

    // 更新連續重複指標
    this.lastWord = wordObj.id;
    this.lastColor = colorObj.id;

    // 決定目標規則 (雙重切換模式時隨機決定看顏色或看字義)
    let targetRule = mode;
    if (mode === 'dual-switch') {
      targetRule = Math.random() < 0.5 ? 'ink-color' : 'text-meaning';
    }

    // 依據目標規則決定正確答案的顏色 ID
    const correctAnswerId = targetRule === 'ink-color' ? colorObj.id : wordObj.id;

    return {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      word: wordObj.name,
      wordId: wordObj.id,
      colorHex: colorObj.hex,
      colorId: colorObj.id,
      colorName: colorObj.name,
      isCongruent,
      targetRule, // 'ink-color' | 'text-meaning'
      correctAnswerId
    };
  }
}
