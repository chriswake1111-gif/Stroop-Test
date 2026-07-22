/**
 * High-Precision Game Timer
 * 採用 performance.now() 控制高精度倒數計時與毫秒級答題計時。
 */

export class GameTimer {
  constructor(onTick, onComplete) {
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.durationSeconds = 30;
    this.startTime = null;
    this.questionStartTime = null;
    this.timerId = null;
    this.remainingSeconds = 30;
    this.isRunning = false;
  }

  start(durationSeconds = 30) {
    this.stop();
    this.durationSeconds = durationSeconds;
    this.remainingSeconds = durationSeconds;
    this.isRunning = true;
    this.startTime = performance.now();
    this.questionStartTime = performance.now();

    this.tick();
  }

  tick = () => {
    if (!this.isRunning) return;

    const elapsedMs = performance.now() - this.startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    this.remainingSeconds = Math.max(0, this.durationSeconds - elapsedSeconds);

    if (this.onTick) {
      this.onTick(this.remainingSeconds);
    }

    if (this.remainingSeconds <= 0) {
      this.stop();
      if (this.onComplete) {
        this.onComplete();
      }
    } else {
      this.timerId = requestAnimationFrame(this.tick);
    }
  };

  /**
   * 重置並傳回該題所花費毫秒數 (ms)
   */
  getQuestionElapsedMs() {
    const now = performance.now();
    const elapsed = now - (this.questionStartTime || now);
    this.questionStartTime = now;
    return Math.round(elapsed);
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }
}
