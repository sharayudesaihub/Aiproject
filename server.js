// Run: $env:GEMINI_API_KEY="your_key"; node server.js   (Node 18+)
import http from 'node:http';

const PORT = 3001;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM = () =>
  `You are Mini Alexa, a friendly voice assistant. Your replies are spoken aloud, so: ` +
  `answer in 1-3 short sentences, plain spoken English, no markdown, no lists, no emojis. ` +
  `Answer any question the person asks. If you lack live data (weather, news, prices), say so briefly. ` +
  `Current date and time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (India).`;

http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404).end();
    return;
  }
  let body = '';
  for await (const chunk of req) body += chunk;

  try {
    const { messages } = JSON.parse(body);

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
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

    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ reply }));
  } catch (e) {
    console.error(e);
    res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: String(e.message || e) }));
  }
}).listen(PORT, () => console.log(`Mini Alexa API on http://localhost:${PORT}`));