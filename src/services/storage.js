/**
 * Storage Service
 * Local-First 持久化服務，維護使用者設定與歷史測驗數據。
 */

const STORAGE_KEY = 'stroop_test_data_v1';

function getLocalDateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDefaultData() {
  return {
    settings: {
      theme: 'warm-sepia',    // 'warm-sepia' | 'dark' | 'light'
      mode: 'ink-color',      // 'ink-color' | 'text-meaning' | 'dual-switch'
      ruleType: 'time',       // 'time' | 'count'
      duration: 30,           // 15, 30, 或 60
      fixedCount: 20,         // 20
      sound: true,
      vibrate: true,
      warmupLimit: 3
    },
    streak: {
      currentStreak: 0,
      lastPlayDate: null,
      bestStreak: 0
    },
    stats: {
      'ink-color': { bestScore: 0, bestRT: null, history: [] },
      'text-meaning': { bestScore: 0, bestRT: null, history: [] },
      'dual-switch': { bestScore: 0, bestRT: null, history: [] }
    },
    warmupCountToday: {
      date: getLocalDateStr(),
      count: 0
    }
  };
}

export class StorageService {
  static load() {
    const defaults = createDefaultData();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.save(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw);
      return {
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        streak: { ...defaults.streak, ...(parsed.streak || {}) },
        stats: {
          'ink-color': { ...defaults.stats['ink-color'], ...(parsed.stats?.['ink-color'] || {}) },
          'text-meaning': { ...defaults.stats['text-meaning'], ...(parsed.stats?.['text-meaning'] || {}) },
          'dual-switch': { ...defaults.stats['dual-switch'], ...(parsed.stats?.['dual-switch'] || {}) }
        },
        warmupCountToday: parsed.warmupCountToday || defaults.warmupCountToday
      };
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
      return defaults;
    }
  }

  static save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  static getSettings() {
    return this.load().settings;
  }

  static saveSettings(newSettings) {
    const data = this.load();
    data.settings = { ...data.settings, ...newSettings };
    this.save(data);
    return data.settings;
  }

  static recordSession(mode, sessionStats, dateOverride = null) {
    const data = this.load();
    const modeStats = data.stats[mode] || { bestScore: 0, bestRT: null, history: [] };
    const todayStr = getLocalDateStr(dateOverride || new Date());

    // 更新個人最佳 (PB)
    if (sessionStats.correctCount > modeStats.bestScore) {
      modeStats.bestScore = sessionStats.correctCount;
    }
    if (sessionStats.avgRT > 0 && (!modeStats.bestRT || sessionStats.avgRT < modeStats.bestRT)) {
      modeStats.bestRT = sessionStats.avgRT;
    }

    // 保留最近 30 筆歷史紀錄
    const historyItem = {
      id: Date.now().toString(),
      date: todayStr,
      score: sessionStats.correctCount,
      accuracy: sessionStats.accuracy,
      avgRT: sessionStats.avgRT,
      congruentAvgRT: sessionStats.congruentAvgRT,
      incongruentAvgRT: sessionStats.incongruentAvgRT,
      stroopDelta: sessionStats.stroopDelta,
      badge: sessionStats.badge
    };

    modeStats.history.unshift(historyItem);
    if (modeStats.history.length > 30) {
      modeStats.history = modeStats.history.slice(0, 30);
    }

    data.stats[mode] = modeStats;

    // 更新每日打卡 Streak
    const streak = data.streak || { currentStreak: 0, lastPlayDate: null, bestStreak: 0 };

    if (streak.lastPlayDate !== todayStr) {
      if (streak.lastPlayDate) {
        const lastDate = new Date(`${streak.lastPlayDate}T00:00:00`);
        const todayDate = new Date(`${todayStr}T00:00:00`);
        const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak.currentStreak += 1;
        } else {
          streak.currentStreak = 1;
        }
      } else {
        streak.currentStreak = 1;
      }
      streak.lastPlayDate = todayStr;
      streak.bestStreak = Math.max(streak.bestStreak || 0, streak.currentStreak);
    }
    data.streak = streak;

    // 更新每日暖身計數
    if (data.warmupCountToday.date !== todayStr) {
      data.warmupCountToday = { date: todayStr, count: 1 };
    } else {
      data.warmupCountToday.count += 1;
    }

    this.save(data);
    return { modeStats, warmupCount: data.warmupCountToday.count, streak: data.streak };
  }
}
