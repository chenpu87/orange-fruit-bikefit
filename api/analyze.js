// ============================================================
// Orange Fruit BikeFit — Vercel Serverless API Proxy
// 使用 Google Gemini 2.5 Flash（免費）
// ============================================================

module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method Not Allowed' } });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: '伺服器未設定 GEMINI_API_KEY' } });
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

    // 先嘗試 gemini-2.5-flash，失敗則 fallback 到 gemini-2.0-flash
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
    ];

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = data.candidates[0].content.parts[0].text;
          console.log(`成功使用 model: ${model}`);
          return res.status(200).json({
            content: [{ type: 'text', text }]
          });
        }

        lastError = data.error?.message || `Model ${model} 無回應`;
        console.log(`${model} 失敗：${lastError}，嘗試下一個...`);

      } catch (e) {
        lastError = e.message;
        console.log(`${model} 例外：${e.message}`);
      }
    }

    throw new Error('所有 model 都失敗：' + lastError);

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: { message: err.message } });
  }
};
