// ============================================================
// Orange Fruit BikeFit — Vercel Serverless API Proxy
// 使用 Google Gemini API（免費方案）
// ============================================================

module.exports = async function handler(req, res) {

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  // 取得 API Key（伺服器端優先，沒有就用前端傳來的）
  const apiKey = process.env.GEMINI_API_KEY || (req.body && req.body.apiKey);

  if (!apiKey) {
    return res.status(400).json({
      error: { message: '請輸入 Gemini API Key' }
    });
  }

  const { apiKey: _removed, messages, model, max_tokens } = req.body;

  try {
    // 把 Anthropic 格式的 messages 轉換成 Gemini 格式
    const parts = [];
    if (messages && messages[0] && messages[0].content) {
      for (const block of messages[0].content) {
        if (block.type === 'image') {
          parts.push({
            inline_data: {
              mime_type: block.source.media_type,
              data: block.source.data,
            }
          });
        } else if (block.type === 'text') {
          parts.push({ text: block.text });
        }
      }
    }

    const geminiBody = {
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: max_tokens || 1200,
        temperature: 0.1,
      }
    };

    const geminiModel = 'gemini-1.5-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: { message: data.error?.message || '分析失敗，請重試' }
      });
    }

    // 把 Gemini 回應格式轉換成前端期望的 Anthropic 格式
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const anthropicFormat = {
      content: [{ type: 'text', text }]
    };

    return res.status(200).json(anthropicFormat);

  } catch (err) {
    console.error('Gemini API 錯誤：', err);
    return res.status(500).json({
      error: { message: '無法連線至 AI 伺服器：' + err.message }
    });
  }
};
