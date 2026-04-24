// api/analyze.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method Not Allowed' } });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: { message: 'GEMINI_API_KEY 未設定' } });

  try {
    const { messages } = req.body;
    const userMessage = messages[0].content;

    const textPart = userMessage.find(c => c.type === 'text')?.text || "";
    const imageParts = userMessage
      .filter(c => c.type === 'image')
      .map(img => ({
        inline_data: { mime_type: "image/jpeg", data: img.source.data }
      }));

    // 改用 gemini-1.5-pro 模組，提供更強的視覺分析能力
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: textPart }, ...imageParts] }],
        generationConfig: { 
          temperature: 0.1, 
          maxOutputTokens: 1500
        }
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `API 呼叫失敗 (HTTP ${response.status})`);
    }

    const resultText = data.candidates[0].content.parts[0].text;

    return res.status(200).json({
      content: [{ type: 'text', text: resultText }]
    });

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
