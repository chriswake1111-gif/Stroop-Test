/**
 * Main Application & Controller
 * 統籌遊戲狀態、DOM 事件綁定、聲音/震動反饋與資料持久化。
 */

import { COLOR_PALETTE, StroopGenerator } from './core/stroop-generator.js';
import { GameTimer } from './core/timer.js';
import { StatsCalculator } from './core/stats-calculator.js';
import { StorageService } from './services/storage.js';
import { AudioService } from './services/audio.js';
import { HapticsService } from './services/haptics.js';
import { TrendChart } from './components/chart.js';
import { ModalManager } from './components/modal.js';
import { renderIcon } from './components/icons.js';

class StroopApp {
  constructor() {
    this.storage = StorageService.load();
    this.audio = new AudioService();
    this.haptics = new HapticsService();
    this.generator = new StroopGenerator(COLOR_PALETTE);
    this.modalManager = new ModalManager(document.getElementById('modal-container'));

    this.currentMode = this.storage.settings.mode || 'ink-color';
    this.currentTheme = this.storage.settings.theme || 'warm-sepia';

    this.audio.setEnabled(this.storage.settings.sound !== false);
    this.haptics.setEnabled(this.storage.settings.vibrate !== false);

    this.timer = new GameTimer(
      (seconds) => this.onTimerTick(seconds),
      () => this.onGameComplete()
    );

    this.currentQuestion = null;
    this.records = [];
    this.score = 0;
    this.isPlaying = false;
    this.isCountingDown = false;
    this.countdownIntervalId = null;
    this.playStartTime = null;

    this.initDOM();
    this.applyTheme(this.currentTheme);
    this.setMode(this.currentMode);
    this.renderButtons();
    this.updateWarmupBadge();
    this.updateStreakBadge();
    this.updateTimerTagDisplay();
  }

  initDOM() {
    // Mode Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.isPlaying || this.isCountingDown) return;
        const mode = e.target.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // Settings Button
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      if (this.isPlaying || this.isCountingDown) return;
      this.modalManager.showSettingsModal(this.storage.settings, (newSettings) => {
        this.storage.settings = StorageService.saveSettings(newSettings);
        this.audio.setEnabled(newSettings.sound);
        this.haptics.setEnabled(newSettings.vibrate);
        this.updateTimerTagDisplay();
      });
    });

    // PWA 安裝提示 (beforeinstallprompt)
    let deferredPrompt = null;
    const installBtn = document.getElementById('btn-pwa-install');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.style.display = 'inline-block';
    });

    installBtn?.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted PWA installation');
      }
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });

    // Theme Button
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      const themes = ['warm-sepia', 'dark', 'light'];
      const nextIdx = (themes.indexOf(this.currentTheme) + 1) % themes.length;
      this.applyTheme(themes[nextIdx]);
    });

    // Stats Button
    document.getElementById('btn-toggle-stats')?.addEventListener('click', () => {
      this.openStatsDrawer();
    });

    document.getElementById('btn-close-stats')?.addEventListener('click', () => {
      document.getElementById('stats-drawer').style.display = 'none';
    });

    // Start Button
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.startGame();
    });
  }

  setMode(mode) {
    this.currentMode = mode;
    StorageService.saveSettings({ mode });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    const banner = document.getElementById('instruction-banner');
    banner.style.color = '';
    if (mode === 'ink-color') {
      banner.textContent = '請點擊【文字的顏色】';
    } else if (mode === 'text-meaning') {
      banner.textContent = '請點擊【文字的意思】';
    } else {
      banner.textContent = '雙重切換：依上方提示選擇目標';
    }
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    StorageService.saveSettings({ theme });
  }

  renderButtons() {
    const grid = document.getElementById('answers-grid');
    grid.innerHTML = '';

    COLOR_PALETTE.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'color-choice-btn';
      btn.style.backgroundColor = c.btnHex || c.hex;
      btn.textContent = c.name;
      btn.setAttribute('data-color-id', c.id);

      btn.addEventListener('click', () => {
        if (!this.isPlaying) return;
        this.handleAnswer(c.id);
      });

      grid.appendChild(btn);
    });
  }

  updateWarmupBadge() {
    const data = StorageService.load();
    const count = data.warmupCountToday?.count || 0;
    const badgeEl = document.getElementById('warmup-count');
    if (badgeEl) badgeEl.textContent = count;
  }

  updateStreakBadge() {
    const data = StorageService.load();
    const streak = data.streak?.currentStreak || 0;
    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.textContent = streak;
  }

  updateTimerTagDisplay() {
    const { ruleType = 'time', duration = 30, fixedCount = 20 } = this.storage.settings;
    const timerTag = document.getElementById('timer-tag');
    const startBtn = document.getElementById('btn-start-game');

    if (timerTag) {
      if (ruleType === 'count') {
        timerTag.innerHTML = `${renderIcon('target', 14)} <span id="timer-display">${fixedCount}</span> 題`;
      } else {
        timerTag.innerHTML = `${renderIcon('timer', 14)} <span id="timer-display">${duration}</span> 秒`;
      }
    }

    if (startBtn) {
      startBtn.textContent = ruleType === 'count'
        ? `開始 ${fixedCount} 題挑戰`
        : `開始 ${duration} 秒暖身`;
    }
  }

  startGame() {
    if (this.isPlaying || this.isCountingDown) return;

    this.score = 0;
    this.records = [];
    this.playStartTime = Date.now();
    this.generator.reset();

    document.getElementById('start-overlay').style.display = 'none';
    document.getElementById('stroop-word').style.display = 'none';
    document.getElementById('score-display').textContent = '0';
    this.updateTimerTagDisplay();

    this.startCountdown(() => {
      this.isPlaying = true;
      document.getElementById('stroop-word').style.display = 'block';

      if (this.storage.settings.ruleType === 'time') {
        this.timer.start(this.storage.settings.duration || 30);
      } else {
        // 固定題數模式不用時間倒數，但依然啟動計時器記錄時間
        this.timer.start(9999);
      }
      this.nextQuestion();
    });
  }

  startCountdown(onComplete) {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }

    this.isCountingDown = true;
    const overlay = document.getElementById('countdown-overlay');
    const textEl = document.getElementById('countdown-text');
    overlay.style.display = 'flex';

    let count = 3;
    textEl.textContent = count.toString();
    textEl.style.color = 'var(--primary)';
    this.audio.playCountdownBeep(false);

    this.countdownIntervalId = setInterval(() => {
      count--;
      if (count > 0) {
        textEl.textContent = count.toString();
        textEl.style.color = 'var(--primary)';
        this.audio.playCountdownBeep(false);
      } else if (count === 0) {
        textEl.textContent = 'GO!';
        textEl.style.color = 'var(--success)';
        this.audio.playCountdownBeep(true);
      } else {
        clearInterval(this.countdownIntervalId);
        this.countdownIntervalId = null;
        this.isCountingDown = false;
        overlay.style.display = 'none';
        if (onComplete) onComplete();
      }
    }, 850);
  }

  nextQuestion() {
    this.currentQuestion = this.generator.generateQuestion(this.currentMode);

    const wordEl = document.getElementById('stroop-word');
    wordEl.textContent = this.currentQuestion.word;
    wordEl.style.color = this.currentQuestion.colorHex;

    const banner = document.getElementById('instruction-banner');
    if (this.currentMode === 'dual-switch') {
      if (this.currentQuestion.targetRule === 'ink-color') {
        banner.textContent = '請選【文字顏色】';
        banner.style.color = 'var(--primary)';
      } else {
        banner.textContent = '請選【文字意思】';
        banner.style.color = 'var(--accent)';
      }
    }

    // 重置單題計時器起點
    this.timer.getQuestionElapsedMs();
  }

  handleAnswer(selectedColorId) {
    if (!this.isPlaying || this.isAnsweringLock) return;

    // 啟動 50ms 防暴力連點鎖 (Idempotency Lock)
    this.isAnsweringLock = true;
    setTimeout(() => {
      this.isAnsweringLock = false;
    }, 50);

    const rt = this.timer.getQuestionElapsedMs();
    const isCorrect = selectedColorId === this.currentQuestion.correctAnswerId;

    if (isCorrect) {
      this.score++;
      this.audio.playCorrect();
      this.haptics.vibrateCorrect();
    } else {
      this.audio.playIncorrect();
      this.haptics.vibrateIncorrect();
    }

    this.records.push({
      isCorrect,
      isCongruent: this.currentQuestion.isCongruent,
      rt
    });

    document.getElementById('score-display').textContent = this.score.toString();

    // 檢查固定題數模式 (20 題)
    const { ruleType = 'time', fixedCount = 20 } = this.storage.settings;
    if (ruleType === 'count') {
      const remaining = Math.max(0, fixedCount - this.records.length);
      const timerDisplay = document.getElementById('timer-display');
      if (timerDisplay) timerDisplay.textContent = remaining.toString();

      if (this.records.length >= fixedCount) {
        this.timer.stop();
        this.onGameComplete();
        return;
      }
    }

    this.nextQuestion();
  }

  onTimerTick(seconds) {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = seconds.toString();
    }
    if (seconds <= 5 && seconds > 0) {
      this.audio.playTick();
    }
  }

  onGameComplete() {
    this.isPlaying = false;
    document.getElementById('start-overlay').style.display = 'flex';
    document.getElementById('stroop-word').style.display = 'none';

    // 計算成績與 Stroop Delta
    const sessionStats = StatsCalculator.calculateSessionStats(this.records);

    // 持久化儲存
    const { warmupCount } = StorageService.recordSession(this.currentMode, sessionStats);
    this.updateWarmupBadge();
    this.updateStreakBadge();

    // 檢查是否達成暖身 3 回合
    if (warmupCount === 3) {
      this.modalManager.showWarmupNotice(warmupCount, () => {
        this.modalManager.showSettlementModal(sessionStats, () => this.startGame());
      });
    } else {
      this.modalManager.showSettlementModal(sessionStats, () => this.startGame());
    }

    // 連續遊玩超過 5 分鐘護眼提醒
    if (this.playStartTime && Date.now() - this.playStartTime > 300000) {
      setTimeout(() => {
        this.modalManager.showRestNotice();
      }, 1000);
    }
  }

  openStatsDrawer() {
    const data = StorageService.load();
    const modeStats = data.stats[this.currentMode] || { bestScore: 0, bestRT: null, history: [] };

    const pbEl = document.getElementById('stats-pb-display');
    if (pbEl) {
      pbEl.textContent = `個人最佳: ${modeStats.bestScore} 題 | 最快 RT: ${modeStats.bestRT || '--'} ms`;
    }

    const drawer = document.getElementById('stats-drawer');
    drawer.style.display = 'flex';

    const canvas = document.getElementById('trend-canvas');
    TrendChart.render(canvas, modeStats.history);
  }
}

// 啟動應用
window.addEventListener('DOMContentLoaded', () => {
  new StroopApp();
});
