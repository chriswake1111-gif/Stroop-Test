/**
 * Modal Manager Component
 * 處理結算頁面、暖身完成提示與疲勞護眼提醒。
 */
import { renderIcon } from './icons.js';

export class ModalManager {
  constructor(containerEl) {
    this.container = containerEl;
  }

  showSettlementModal(stats, onRestart) {
    const { total, correctCount, accuracy, avgRT, congruentAvgRT, incongruentAvgRT, stroopDelta, badge } = stats;
    const badgeIconHtml = renderIcon(badge?.iconName || 'award', 38);

    const html = `
      <div class="modal-overlay active">
        <div class="modal-card animate-pop" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="badge-icon">${badgeIconHtml}</span>
            <h2>挑戰結算</h2>
            <p class="badge-title">${badge ? badge.title : '表現穩定'}</p>
          </div>

          <div class="modal-body">
            <div class="stats-grid">
              <div class="stat-box highlight">
                <span class="stat-label">Stroop 干擾差值</span>
                <span class="stat-value ${stroopDelta <= 60 ? 'good' : 'warning'}">${stroopDelta} <small>ms</small></span>
                <span class="stat-sub">越低代表越不受干擾</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">平均反應時間</span>
                <span class="stat-value">${avgRT} <small>ms</small></span>
                <span class="stat-sub">參考目標 &lt; 450ms</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">正確率</span>
                <span class="stat-value">${accuracy}<small>%</small></span>
                <span class="stat-sub">答對 ${correctCount} / ${total} 題</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">衝突題 vs 一致題</span>
                <span class="stat-value sm">${incongruentAvgRT} / ${congruentAvgRT} <small>ms</small></span>
                <span class="stat-sub">衝突題 / 一致題 RT</span>
              </div>
            </div>

            <div class="badge-desc-box">
              <p><strong>專注小觀察：</strong> ${badge ? badge.desc : '持續維持專注練習節奏！'}</p>
            </div>
            <p class="disclaimer-note">僅供日常專注練習參考，非醫療或臨床診斷。</p>
          </div>

          <div class="modal-footer">
            <button id="btn-modal-restart" class="btn btn-primary btn-block">再挑戰一局</button>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    document.getElementById('btn-modal-restart')?.addEventListener('click', () => {
      this.close();
      if (onRestart) onRestart();
    });
  }

  showSettingsModal(settings, onSave) {
    const { ruleType = 'time', duration = 30, sound = true, vibrate = true } = settings;

    const html = `
      <div class="modal-overlay active">
        <div class="modal-card animate-pop" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="badge-icon">${renderIcon('settings', 34)}</span>
            <h2>遊戲與偏好設定</h2>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
            <!-- 規則模式選單 -->
            <div class="setting-group">
              <label class="setting-label">回合計算模式</label>
              <div class="pill-group">
                <button class="pill-btn ${ruleType === 'time' ? 'active' : ''}" data-rule="time">時間倒數</button>
                <button class="pill-btn ${ruleType === 'count' ? 'active' : ''}" data-rule="count">固定 20 題</button>
              </div>
            </div>

            <!-- 時間選擇 (只有在 time 模式顯示) -->
            <div class="setting-group" id="group-duration" style="${ruleType === 'count' ? 'display: none;' : ''}">
              <label class="setting-label">單局時間限制</label>
              <div class="pill-group">
                <button class="pill-btn ${duration === 15 ? 'active' : ''}" data-duration="15">15 秒 (極速)</button>
                <button class="pill-btn ${duration === 30 ? 'active' : ''}" data-duration="30">30 秒 (標準)</button>
                <button class="pill-btn ${duration === 60 ? 'active' : ''}" data-duration="60">60 秒 (耐力)</button>
              </div>
            </div>

            <!-- 音效與震動開關 -->
            <div class="setting-group toggle-row">
              <label for="setting-sound" class="setting-label">${renderIcon('volume', 16)} 提示音效</label>
              <input type="checkbox" id="setting-sound" class="toggle-checkbox" ${sound ? 'checked' : ''}>
            </div>

            <div class="setting-group toggle-row">
              <label for="setting-vibrate" class="setting-label">${renderIcon('vibrate', 16)} 微震動觸控反饋</label>
              <input type="checkbox" id="setting-vibrate" class="toggle-checkbox" ${vibrate ? 'checked' : ''}>
            </div>
          </div>

          <div class="modal-footer">
            <button id="btn-save-settings" class="btn btn-primary btn-block">儲存並返回</button>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    let selectedRule = ruleType;
    let selectedDuration = duration;

    // 點擊事件
    document.querySelectorAll('[data-rule]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedRule = e.target.getAttribute('data-rule');
        document.querySelectorAll('[data-rule]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const durGroup = document.getElementById('group-duration');
        if (durGroup) durGroup.style.display = selectedRule === 'count' ? 'none' : 'block';
      });
    });

    document.querySelectorAll('[data-duration]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedDuration = parseInt(e.target.getAttribute('data-duration'), 10);
        document.querySelectorAll('[data-duration]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      const soundVal = document.getElementById('setting-sound').checked;
      const vibrateVal = document.getElementById('setting-vibrate').checked;

      const newSettings = {
        ruleType: selectedRule,
        duration: selectedDuration,
        fixedCount: 20,
        sound: soundVal,
        vibrate: vibrateVal
      };

      this.close();
      if (onSave) onSave(newSettings);
    });
  }

  showWarmupNotice(count, onContinue) {
    const html = `
      <div class="modal-overlay active">
        <div class="modal-card animate-pop" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="badge-icon">${renderIcon('brain', 36)}</span>
            <h2>今日暖身完成</h2>
            <p class="badge-title">已完成 ${count} 回合練習</p>
          </div>

          <div class="modal-body">
            <p style="text-align: center; color: var(--text-color); font-size: 1rem; line-height: 1.6;">
              太棒了！專注狀態已順利開機，準備好迎接接下來的學習或工作。
            </p>
          </div>

          <div class="modal-footer">
            <button id="btn-modal-continue" class="btn btn-primary btn-block">查看本次結算</button>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    document.getElementById('btn-modal-continue')?.addEventListener('click', () => {
      this.close();
      if (onContinue) onContinue();
    });
  }

  showRestNotice(onDismiss) {
    const html = `
      <div class="modal-overlay active">
        <div class="modal-card animate-pop" role="dialog" aria-modal="true">
          <div class="modal-header">
            <span class="badge-icon">${renderIcon('coffee', 36)}</span>
            <h2>護眼休息提醒</h2>
            <p class="badge-title">您已連續練習超過 5 分鐘</p>
          </div>

          <div class="modal-body">
            <p style="text-align: center; color: var(--text-color); font-size: 1rem; line-height: 1.6;">
              建議眨眨眼、望向遠處休息 20 秒，讓眼部肌肉放鬆再繼續。
            </p>
          </div>

          <div class="modal-footer">
            <button id="btn-modal-rest-dismiss" class="btn btn-primary btn-block">好的，休息一下</button>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    document.getElementById('btn-modal-rest-dismiss')?.addEventListener('click', () => {
      this.close();
      if (onDismiss) onDismiss();
    });
  }

  close() {
    this.container.innerHTML = '';
  }
}
