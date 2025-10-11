// api/test_gemini.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // **********************************************
  // ** تنبيه: هذا تعيين مؤقت لمفتاح API لأغراض الاختبار. **
  // ** يجب إزالته أو تغييره لاستخدام process.env.GEMINI_API_KEY **
  // ** قبل النشر لأسباب أمنية.                             **
  // **********************************************
  const API_KEY = "AIzaSyChw8BU7NYTg0GzQH-0b3RG15v63MtGpL4"; // <--- تم التعديل هنا

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set.' });
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: "اكتب سؤال واحد تجريبي بسيط لاختبار النموذج." }] }],
    systemInstruction: { parts: [{ text: "أجب بصيغة JSON بسيطة: { \"test\": \"ok\" }" }] },
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  try {
    const apiResp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // timeout handling optional
    });

    const text = await apiResp.text();
    // رجّع النص الخام من Gemini عشان نشوف هل في استجابة
    return res.status(apiResp.status).send({ ok: apiResp.ok, raw: text });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal proxy error', details: err.message });
  }
}
