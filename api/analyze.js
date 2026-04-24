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

    // 【核心修復】使用 v1beta 端點並確保模型路徑正確
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: textPart }, ...imageParts] }],
        generationConfig: { 
          temperature: 0.1 // 降低隨機性以穩定輸出
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API 詳細錯誤報錯:', JSON.stringify(data));
      throw new Error(data.error?.message || `API 狀態碼: ${response.status}`);
    }

    const resultText = data.candidates[0].content.parts[0].text;

    return res.status(200).json({
      content: [{ type: 'text', text: resultText }]
    });

  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
