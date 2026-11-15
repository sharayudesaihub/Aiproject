const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM = () =>
  `You are Mini Alexa, a friendly voice assistant. Your replies are spoken aloud, so: ` +
  `answer in 1-3 short sentences, plain spoken English, no markdown, no lists, no emojis. ` +
  `Answer any question the person asks. If you lack live data (weather, news, prices), say so briefly. ` +
  `Current date and time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (India).`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { messages } = req.body;

    const contents = messages.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content).slice(0, 2000) }],
    }));

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM() }] },
          contents,
          generationConfig: {
            maxOutputTokens: 300,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || 'API error');

    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || '')
      .join(' ')
      .trim();
    if (!reply) throw new Error('Empty reply');

    res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
}