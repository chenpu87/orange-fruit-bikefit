// ============================================================
// Orange Fruit BikeFit — Vercel Serverless API Proxy
// 檔案路徑：api/analyze.js
//
// 功能：
//   把前端的請求安全地轉發給 Anthropic API
//   API Key 存在 Vercel 環境變數，不會暴露給瀏覽器
//
// 部署步驟：
//   1. 把此檔案放在專案的 api/ 資料夾
//   2. 在 Vercel Dashboard → Settings → Environment Variables
//      新增 ANTHROPIC_API_KEY = sk-ant-xxx...
//   3. 重新部署即可
// ============================================================

export default async function handler(req, res) {

  // ── CORS 設定 ──────────────────────────────────────────
  // 允許你的網域（部署後可改為你的實際網址以增加安全性）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── 只接受 POST ────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  // ── 確認 API Key 存在 ──────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY 環境變數未設定');
    return res.status(500).json({
      error: { message: '伺服器設定錯誤：API Key 未設定，請至 Vercel Dashboard 設定環境變數' }
    });
  }

  // ── 轉發請求至 Anthropic API ────────────────────────────
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // 把 Anthropic 的回應直接傳回前端
    return res.status(response.status).json(data);

  } catch (err) {
    console.error('Anthropic API 呼叫失敗：', err.message);
    return res.status(500).json({
      error: { message: '無法連線至 AI 伺服器：' + err.message }
    });
  }
}
