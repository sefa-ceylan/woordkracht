// Netlify serverless function — proxies dictionary lookups to the Anthropic API.
// The API key lives ONLY here, as a Netlify environment variable (ANTHROPIC_API_KEY),
// and is never sent to or visible from the browser.

exports.handler = async function (event) {
  // CORS + method guard
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let query;
  try {
    const body = JSON.parse(event.body || '{}');
    query = typeof body.query === 'string' ? body.query.trim() : '';
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!query || query.length > 100) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid query' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server is not configured (missing API key)' }) };
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
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Dictionary service unavailable' }) };
    }

    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error('Dictionary function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Lookup failed' }) };
  }
};
