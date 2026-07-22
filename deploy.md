# ☁️ Cloudflare Pages 部署與 PWA 安裝指南

本指南提供將「斯特魯普專注挑戰 (Stroop Test PWA)」部署至 **Cloudflare Pages** 的兩種極簡方式，以及使用者的 PWA 安裝說明。

---

## 🛠️ 1. 部署準備 (已自動為您配置)

專案根目錄與打包資料夾中已包含以下 Cloudflare Pages 專屬配置檔：

- **`public/_headers`**：
  - `sw.js` 採用 `no-cache, no-store`（確保 PWA 無感秒速更新）。
  - `assets` 靜態資源啟用 1 年強快取。
  - 全域資安 Headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`)。
- **`public/_redirects`**：
  - `/* /index.html 200`（確保單頁應用 SPA 路由運作無阻）。
- **`wrangler.toml`**：
  - 定義 Pages 專案名稱 `stroop-test-pwa` 與輸出目錄 `./dist`。
- **`manifest.json` + `sw.js`**：
  - 完整離線快取與 SVG/PNG 向量 Maskable Icon。

---

## 🚀 2. 兩種部署方式

### 方式 A：GitHub 自動化連動部署 (推薦，零維護)

1. **推送程式碼至 GitHub**：
   ```bash
   git add .
   git commit -m "feat: Cloudflare Pages & PWA readiness"
   git push origin main
   ```
2. **登入 Cloudflare Dashboard**：
   - 開啟 [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ 點擊左側 **Workers & Pages** ➔ **Create application** ➔ 選擇 **Pages** ➔ **Connect to Git**。
3. **選擇您的 GitHub 儲存庫**：
   - **Framework preset**：選擇 `Vite`
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
4. **點擊 Save and Deploy**：
   - 幾秒鐘內即可獲得免費的高速 HTTPS 網址 (如 `https://stroop-test-pwa.pages.dev`)！

---

### 方式 B：使用 Wrangler CLI 直接上傳部署 (最快 30 秒)

在本地終端機執行以下命令直接發布：

1. **打包專案**：
   ```bash
   npm run build
   ```
2. **執行 Cloudflare Wrangler 上傳**：
   ```bash
   npx wrangler pages deploy dist --project-name=stroop-test-pwa
   ```
   *(初次執行會引導登入 Cloudflare 帳號)*

---

## 📱 3. 使用者 PWA 安裝步驟 (iOS / Android / Desktop)

網址提供 HTTPS 服務後（Cloudflare Pages 預設啟用），使用者即可在各式裝置上一鍵安裝：

### 📱 Android / Chrome / Edge
1. 用瀏覽器開啟網址後，頁面右上角會顯示 **`📲 安裝 App`** 按鈕。
2. 點擊按鈕，或點選瀏覽器選單 ➔ **「安裝應用程式」** 或 **「加到主畫面」**。
3. 即可像原生 App 一樣從手機桌面離線開啟！

### 🍎 iPhone / iPad (iOS Safari)
1. 用 Safari 開啟網址。
2. 點擊底部中間的 **分享圖示 (Share)**。
3. 向下滾動點選 **「加入主畫面 (Add to Home Screen)」**。

### 💻 電腦版 (Chrome / Edge / Safari Desktop)
1. 網址列右側會出現安裝圖示，點擊 **「安裝 斯特魯普專注挑戰」** 即可於獨立 App 視窗遊玩。
