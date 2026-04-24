// ============================================================
// Orange Fruit BikeFit — Vercel Serverless API Proxy (Gemini Stable v1)
// ============================================================

export default async function handler(req, res) {
  // ── CORS 設定 ──────────────────────────────────────────
  // 允許前端網域進行跨網域請求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 CORS 預檢請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只接受 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  // ── 檢查環境變數 ──────────────────────────────────────
  // 請確保在 Vercel Settings -> Environment Variables 設定此 Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('錯誤：GEMINI_API_KEY 環境變數未設定');
    return res.status(500).json({
      error: { message: '伺服器設定錯誤：API Key 未設定，請至 Vercel Dashboard 設定環境變數' }
    });
  }

  try {
    const { messages } = req.body;
    const userMessage = messages[0].content;

    // 1. 提取前端傳來的文字指令
    const textPart = userMessage.find(c => c.type === 'text')?.text || "請分析這兩張 BikeFit 照片，並以 JSON 格式回傳角度數據。";

    // 2. 提取圖片並轉換為 Gemini 的 inline_data 格式 (Base64)
    const imageParts = userMessage
      .filter(c => c.type === 'image')
      .map(img => ({
        inline_data: {
          mime_type: "image/jpeg",
          data: img.source.data // 此處為前端傳來的 Base64 去掉標頭後的純資料
        }
      }));

    // ── 呼叫 Google Gemini API 穩定版 v1 ──────────────────
    // 使用 v1 版本並確保模型名稱正確，避免出現 "Model not found" 錯誤
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
          // 強制要求 Gemini 直接回傳 JSON 物件，不帶 Markdown 標籤
          response_mime_type: "application/json",
          temperature: 0.2
        }
      }),
    });

    const data = await response.json();

    // 檢查 Google API 是否回傳錯誤
    if (!response.ok) {
      console.error('Gemini API Error:', data.error);
      throw new Error(data.error?.message || `API 請求失敗 (HTTP ${response.status})`);
    }

    // 3. 提取 Gemini 生成的 JSON 文字
    const resultText = data.candidates[0].content.parts[0].text;

    // ── 格式適配器 (Adapter) ──────────────────────────────
    // 封裝成前端 index.html 預期接收的 content[0].text 結構
    return res.status(200).json({
      content: [
        {
          type: 'text',
          text: resultText
        }
      ]
    });

  } catch (err) {
    console.error('後端分析程序錯誤:', err.message);
    return res.status(500).json({
      error: { message: '分析過程中發生錯誤：' + err.message }
    });
  }
}
