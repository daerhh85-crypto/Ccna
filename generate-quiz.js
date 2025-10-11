// هذا الملف هو الخادم الوكيل الخلفي (Backend Proxy)
// يجب نشره على منصة Serverless (مثل Vercel/Netlify) داخل مجلد 'api'.

// قراءة المفتاح من متغيرات البيئة - هذا يضمن الأمان
const API_KEY = process.env.GEMINI_API_KEY; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

// تعريف مخطط JSON (Schema) للأسئلة
const responseSchema = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            "question_text": { "type": "STRING" },
            "domain_ar": { "type": "STRING" },
            "options": {
                "type": "ARRAY",
                "items": { "type": "STRING" }
            },
            "correct_index": { "type": "INTEGER" },
            "explanation_ar": { "type": "STRING" }
        },
        required: ["question_text", "domain_ar", "options", "correct_index", "explanation_ar"]
    }
};

const systemPrompt = `
    أنت خبير في اختبارات CCNA 200-301 v1.1. 
    مهمتك هي إنشاء مجموعة من 10 أسئلة اختيار من متعدد باللغة العربية.
    يجب أن تغطي الأسئلة الـ 10 مجموعة متنوعة من مسارات CCNA السبعة.
    يجب أن يكون الناتج JSON صالحاً وفقاً للمخطط المحدد.
`;

const userQuery = "قم بتوليد 10 أسئلة متقدمة لاختبار CCNA 200-301 v1.1. تأكد من أن كل سؤال مصنف بدقة ضمن أحد مسارات CCNA السبعة.";

/**
 * معالج الطلب (يعمل كـ API)
 */
export default async function handler(req, res) {
    // 1. التحقق الأمني من وجود المفتاح في متغيرات البيئة
    if (!API_KEY) {
        // رسالة خطأ آمنة لا تكشف المفتاح
        return res.status(500).json({ error: "GEMINI_API_KEY is not set. Please configure environment variables." });
    }

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };

    try {
        // 2. الاتصال الآمن بـ Gemini API باستخدام المفتاح المخفي
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            // إرجاع خطأ عام بدلاً من تفاصيل Gemini API
            return res.status(apiResponse.status).json({ error: "Failed to generate quiz content from external API." });
        }

        const result = await apiResponse.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!jsonText) {
            return res.status(500).json({ error: "AI failed to return structured content." });
        }

        const parsedQuestions = JSON.parse(jsonText);

        // 3. إرجاع الأسئلة النظيفة إلى الواجهة الأمامية
        // ملاحظة: يتم إرجاع الكائن { questions: [...] }
        return res.status(200).json({ questions: parsedQuestions });

    } catch (error) {
        console.error("Serverless Function Error:", error);
        // تأكد من أن 'res' متاح قبل استخدامه
        if (res && typeof res.status === 'function') {
            return res.status(500).json({ error: "An internal server error occurred during quiz generation." });
        }
    }
}
