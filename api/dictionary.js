// Vercel serverless function — proxies dictionary lookups to the Anthropic API.
// The API key lives ONLY here, as a Vercel environment variable (ANTHROPIC_API_KEY),
// and is never sent to or visible from the browser.

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

  let query;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    query = typeof body.query === 'string' ? body.query.trim() : '';
  } catch (e) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  if (!query || query.length > 100) {
    res.status(400).json({ error: 'Invalid query' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is not configured (missing API key)' });
    return;
  }

  const prompt = `You are a Dutch dictionary for English, Turkish, and Arabic speakers. The user searched for: "${query}".
This could be a Dutch word/phrase, or an English/Turkish/Arabic word/phrase whose Dutch equivalent is wanted.
Pick the single most likely, most common match. Respond with ONLY raw JSON, no markdown, no code fences, no explanation:
{"nl":"the Dutch word/phrase, correctly spelled","en":"concise English meaning","tr":"concise Turkish meaning","ar":"concise Arabic meaning","ipa":"a simple bracket pronunciation guide like [voor-BEELT], approximating Dutch sounds for an English speaker","cat":"noun, verb, adjective, adverb, or phrase","level":"a rough CEFR guess: A1, A2, B1, B2, C1 or C2","example":"one short natural Dutch example sentence using the word"}`;

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
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      res.status(502).json({ error: 'Dictionary service unavailable' });
      return;
    }

    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.status(200).json(result);
  } catch (err) {
    console.error('Dictionary function error:', err);
    res.status(500).json({ error: 'Lookup failed' });
  }
};
