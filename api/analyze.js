// ============================================================
// Orange Fruit BikeFit — Vercel Serverless API Proxy
// 版本：接受前端傳入的 API Key
// ============================================================

export default async function handler(req, res) {

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method Not Allowed' } });

  // 優先用伺服器端 Key，沒有的話用前端傳來的 Key
  const apiKey = process.env.ANTHROPIC_API_KEY || req.body?.apiKey;

  if (!apiKey) {
    return res.status(400).json({
      error: { message: '請輸入 Anthropic API Key' }
    });
  }

  // 把 apiKey 從 body 移除，不要傳給 Anthropic
  const { apiKey: _removed, ...body } = req.body;

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
    return res.status(500).json({
      error: { message: '無法連線至 AI 伺服器：' + err.message }
    });
  }
}
