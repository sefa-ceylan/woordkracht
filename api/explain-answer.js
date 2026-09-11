// Vercel serverless function — when a quiz answer is wrong, this asks Claude
// for a short, concrete explanation of what the wrong word actually means and
// an example sentence using it correctly, so a mistake becomes a mini lesson
// instead of just a red X. The API key lives only here (ANTHROPIC_API_KEY)
// and is never exposed to the browser.

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let correctWord, correctMeaning, wrongAnswer, uiLanguage;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    correctWord = typeof body.correctWord === 'string' ? body.correctWord.trim() : '';
    correctMeaning = typeof body.correctMeaning === 'string' ? body.correctMeaning.trim() : '';
    wrongAnswer = typeof body.wrongAnswer === 'string' ? body.wrongAnswer.trim() : '';
    uiLanguage = ['nl', 'en', 'tr', 'ar'].includes(body.uiLanguage) ? body.uiLanguage : 'en';
  } catch (e) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  if (!correctWord || !wrongAnswer || correctWord.length > 100 || wrongAnswer.length > 200) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is not configured (missing API key)' });
    return;
  }

  const languageNames = { nl: 'Dutch', en: 'English', tr: 'Turkish', ar: 'Arabic' };
  const prompt = `A Dutch (NT2) learner just answered a vocabulary quiz question incorrectly.
The correct Dutch word/answer was: "${correctWord}" (meaning: "${correctMeaning}")
The learner's incorrect answer was: "${wrongAnswer}"

Explain, in simple ${languageNames[uiLanguage]}, what went wrong — either what the wrong word/phrase actually means (if it's a real Dutch word or a plausible answer), or why it doesn't fit, in a way a language learner can quickly understand. Then give ONE short natural Dutch example sentence that correctly uses "${correctWord}".

Respond with ONLY raw JSON, no markdown, no code fences:
{"explanation":"<1-2 short sentences in ${languageNames[uiLanguage]}>","example":"<one short Dutch example sentence using ${correctWord}>"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      res.status(502).json({ error: 'Explanation service unavailable' });
      return;
    }

    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.status(200).json(result);
  } catch (err) {
    console.error('Explain-answer function error:', err);
    res.status(500).json({ error: 'Explanation failed' });
  }
};
