/**
 * Modal Manager Component
 * 處理結算頁面、暖身完成提示與疲勞護眼提醒。
 */

export class ModalManager {
  constructor(containerEl) {
    this.container = containerEl;
  }

  showSettlementModal(stats, onRestart) {
    const { total, correctCount, accuracy, avgRT, congruentAvgRT, incongruentAvgRT, stroopDelta, badge } = stats;

    const html = `
      <div class="modal-overlay active">
        <div class="modal-card animate-pop">
          <div class="modal-header">
            <span class="badge-icon">${badge ? badge.icon : '🎉'}</span>
            <h2>挑戰結算</h2>
            <p class="badge-title">${badge ? badge.title : '表現優異'}</p>
          </div>

          <div class="modal-body">
            <div class="stats-grid">
              <div class="stat-box highlight">
                <span class="stat-label">Stroop 干擾值</span>
                <span class="stat-value ${stroopDelta <= 60 ? 'good' : 'warning'}">${stroopDelta} <small>ms</small></span>
                <span class="stat-sub">越低抗干擾越強</span>
              </div>
              <div class="stat-box">
                <span class="stat-label">平均反應時間</span>
                <span class="stat-value">${avgRT} <small>ms</small></span>
                <span class="stat-sub">目標 < 450ms</span>
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
              <p>💡 <strong>OT 臨床解析：</strong> ${badge ? badge.desc : '繼續鍛鍊大腦前額葉！'}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button id="btn-modal-restart" class="btn btn-primary btn-block">再挑戰一局 🚀</button>
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
    const { ruleType = 'time', duration = 30, fixedCount = 20, sound = true, vibrate = true } = settings;

    const html = `
      <div class="modal-overlay active">
        <div class="modal-card animate-pop">
          <div class="modal-header">
            <span class="badge-icon">⚙️</span>
            <h2>遊戲與偏好設定</h2>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
            <!-- 規則模式選單 -->
            <div class="setting-group">
              <label class="setting-label">回合計算模式</label>
              <div class="pill-group">
                <button class="pill-btn ${ruleType === 'time' ? 'active' : ''}" data-rule="time">⏱️ 時間倒數</button>
                <button class="pill-btn ${ruleType === 'count' ? 'active' : ''}" data-rule="count">🎯 固定 20 題</button>
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
              <span class="setting-label">🔊 Web Audio 提示音</span>
              <input type="checkbox" id="setting-sound" class="toggle-checkbox" ${sound ? 'checked' : ''}>
            </div>

            <div class="setting-group toggle-row">
              <span class="setting-label">📳 微震動觸控反饋</span>
              <input type="checkbox" id="setting-vibrate" class="toggle-checkbox" ${vibrate ? 'checked' : ''}>
            </div>
          </div>

          <div class="modal-footer">
            <button id="btn-save-settings" class="btn btn-primary btn-block">儲存並返回 💾</button>
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
        <div class="modal-card animate-pop">
          <div class="modal-header">
            <span class="badge-icon">🧠</span>
            <h2>大腦暖身完成！</h2>
            <p class="badge-title">今日已完成 ${count} 回合暖身</p>
          </div>

          <div class="modal-body">
            <p style="text-align: center; color: var(--text-color); font-size: 1.05rem; line-height: 1.6;">
              太棒了！您的大腦前額葉抑制控制網絡已經開機，準備好迎接高效學習或工作！
            </p>
          </div>

          <div class="modal-footer">
            <button id="btn-modal-continue" class="btn btn-primary btn-block">繼續挑戰 🌟</button>
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
        <div class="modal-card animate-pop">
          <div class="modal-header">
            <span class="badge-icon">🍵</span>
            <h2>護眼疲勞提醒</h2>
            <p class="badge-title">您已連續遊玩超過 5 分鐘</p>
          </div>

          <div class="modal-body">
            <p style="text-align: center; color: var(--text-color); font-size: 1.05rem; line-height: 1.6;">
              建議眨眨眼、望向 20 呎外的遠處休息 20 秒，讓眼部肌肉放鬆，保護靈魂之窗！
            </p>
          </div>

          <div class="modal-footer">
            <button id="btn-modal-rest-dismiss" class="btn btn-primary btn-block">好的，休息一下 🌿</button>
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
