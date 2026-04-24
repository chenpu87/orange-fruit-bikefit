// ============================================================
// Orange Fruit BikeFit — Vercel Serverless API Proxy
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

  // 優先用伺服器端 Key，沒有就用前端傳來的 Key
  const apiKey = process.env.ANTHROPIC_API_KEY || (req.body && req.body.apiKey);

  if (!apiKey) {
    return res.status(400).json({
      error: { message: '請輸入 Anthropic API Key' }
    });
  }

  // 把 apiKey 從 body 移除，不傳給 Anthropic
  const body = Object.assign({}, req.body);
  delete body.apiKey;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (err) {
    console.error('Anthropic API 錯誤：', err);
    return res.status(500).json({
      error: { message: '無法連線至 AI 伺服器：' + err.message }
    });
  }
};
