/**
 * Canvas Trend Chart Component
 * 使用 Native HTML5 Canvas 繪製近 10 次反應時間與 Stroop 干擾值折線圖。
 */

export class TrendChart {
  /**
   * 繪製反應時間與干擾值折線圖
   * @param {HTMLCanvasElement} canvas
   * @param {Array<Object>} history - [{ score, avgRT, stroopDelta, date }]
   */
  static render(canvas, history = []) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 處理 High DPI 螢幕清晰度
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = (rect.width || 340) * dpr;
    canvas.height = (rect.height || 200) * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width || 340;
    const height = rect.height || 200;

    // 清空背景
    ctx.clearRect(0, 0, width, height);

    if (!history || history.length === 0) {
      ctx.fillStyle = 'var(--text-muted, #94A3B8)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('尚無測試紀錄，完成第一局解鎖趨勢圖！', width / 2, height / 2);
      return;
    }

    // 取最近 10 筆並反轉（由舊到新）
    const data = [...history].slice(0, 10).reverse();
    const padding = { top: 30, right: 20, bottom: 40, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // 取得 Y 軸範圍
    const rts = data.map(d => d.avgRT || 0);
    const deltas = data.map(d => d.stroopDelta || 0);
    const maxVal = Math.max(...rts, ...deltas, 600);
    const minVal = Math.max(0, Math.min(...rts, ...deltas, 200) - 50);

    // 輔助線 (Y 軸)
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'right';

    const steps = 3;
    for (let i = 0; i <= steps; i++) {
      const val = Math.round(minVal + ((maxVal - minVal) / steps) * i);
      const y = padding.top + chartH - (chartH / steps) * i;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`${val}ms`, padding.left - 6, y + 3);
    }

    // 計算點座標
    const pointsRT = data.map((d, idx) => {
      const x = padding.left + (chartW / Math.max(1, data.length - 1)) * idx;
      const y = padding.top + chartH - ((d.avgRT - minVal) / (maxVal - minVal)) * chartH;
      return { x, y, val: d.avgRT };
    });

    const pointsDelta = data.map((d, idx) => {
      const x = padding.left + (chartW / Math.max(1, data.length - 1)) * idx;
      const y = padding.top + chartH - ((d.stroopDelta - minVal) / (maxVal - minVal)) * chartH;
      return { x, y, val: d.stroopDelta };
    });

    // 1. 繪製 Stroop Delta 虛域折線 (紫色/橙色)
    this.drawLine(ctx, pointsDelta, '#8B5CF6', [4, 4]);

    // 2. 繪製 平均 RT 實線 (藍色)
    this.drawLine(ctx, pointsRT, '#3B82F6', []);

    // 3. 圖例
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';

    // RT 圖例
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(padding.left, 8, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.fillText('平均反應時間 (RT)', padding.left + 18, 18);

    // Delta 圖例
    ctx.fillStyle = '#8B5CF6';
    ctx.fillRect(padding.left + 140, 8, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.fillText('Stroop 干擾值 (Delta)', padding.left + 158, 18);
  }

  static drawLine(ctx, points, color, dashPattern = []) {
    if (points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(dashPattern);

    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 點
    ctx.setLineDash([]);
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}
