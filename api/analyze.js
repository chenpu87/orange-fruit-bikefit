// ============================================================
// Orange Fruit BikeFit — Vercel Serverless API Proxy (Gemini Edition)
// ============================================================

export default async function handler(req, res) {
  // ── CORS 設定 ──────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method Not Allowed' } });

  // ── 確認 Gemini API Key ────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: '伺服器設定錯誤：GEMINI_API_KEY 未設定' }
    });
  }

  try {
    const { messages } = req.body;
    const userMessage = messages[0].content;

    // 1. 提取文字指令
    const textPart = userMessage.find(c => c.type === 'text')?.text || "";

    // 2. 提取圖片並轉為 Gemini 格式 (Base64)
    const imageParts = userMessage
      .filter(c => c.type === 'image')
      .map(img => ({
        inline_data: {
          mime_type: "image/jpeg",
          data: img.source.data // 前端傳來的 Base64 字串
        }
      }));

    // ── 呼叫 Google Gemini API ─────────────────────────────
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: textPart },
              ...imageParts
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json", // 強制要求 JSON 回傳
          temperature: 0.2
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API 請求失敗');
    }

    // 提取 Gemini 的回傳文字
    const resultText = data.candidates[0].content.parts[0].text;

    // ── 格式適配器 (Adapter) ──────────────────────────────
    // 為了讓 index.html 不必改動，我們把結果封裝成原本前端預期的 Claude 格式
    return res.status(200).json({
      content: [
        {
          type: 'text',
          text: resultText
        }
      ]
    });

  } catch (err) {
    console.error('Analyze Error:', err);
    return res.status(500).json({
      error: { message: err.message || '分析過程中發生未知錯誤' }
    });
  }
}
