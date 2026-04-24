// ============================================================
// Orange Fruit BikeFit — Vercel Serverless API Proxy
// 使用 Google Gemini 1.5 Flash（免費）
// API Key 存在 Vercel 環境變數，用戶不需要輸入
// ============================================================

module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method Not Allowed' } });

  // Key 只從伺服器端環境變數取得，不接受前端傳入
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: '伺服器未設定 GEMINI_API_KEY，請至 Vercel 環境變數設定' } });
  }

  try {
    const { messages } = req.body;
    const userContent = messages[0].content;

    // 轉換成 Gemini 格式
    const parts = [];
    for (const block of userContent) {
      if (block.type === 'text') {
        parts.push({ text: block.text });
      } else if (block.type === 'image') {
        parts.push({
          inline_data: {
            mime_type: block.source.media_type || 'image/jpeg',
            data: block.source.data,
          }
        });
      }
    }

    // 用 v1beta 端點，支援 gemini-1.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: 1200,
          temperature: 0.1,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini Error:', JSON.stringify(data));
      throw new Error(data.error?.message || `Gemini API 錯誤 HTTP ${response.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 回傳 Anthropic 相容格式（前端不需要改）
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: { message: err.message } });
  }
};
