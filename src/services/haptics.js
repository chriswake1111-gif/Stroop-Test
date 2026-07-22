/**
 * Haptic Vibration Service (Web Vibration API)
 */

export class HapticsService {
  constructor() {
    this.enabled = true;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  vibrate(pattern = 50) {
    if (!this.enabled) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Safe fallback if unsupported or blocked by browser policy
      }
    }
  }

  vibrateCorrect() {
    this.vibrate(20);
  }

  vibrateIncorrect() {
    this.vibrate([40, 30, 40]);
  }
}
