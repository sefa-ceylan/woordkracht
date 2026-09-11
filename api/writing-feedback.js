// Vercel serverless function — sends the user's Dutch essay text to Claude for
// structured B2-level writing feedback (grammar/vocabulary/structure scores,
// specific mistakes, and vocabulary upgrade suggestions). The API key lives
// only here as a Vercel environment variable (ANTHROPIC_API_KEY) and is never
// exposed to the browser.

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

  let prompt, text, level;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    text = typeof body.text === 'string' ? body.text.trim() : '';
    level = (body.level === 'B1') ? 'B1' : 'B2';
  } catch (e) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  // Basic sanity limits: long enough to actually evaluate, short enough to
  // keep the model call cheap and prevent abuse via huge payloads.
  if (!prompt || !text || text.length < 20 || text.length > 3000) {
    res.status(400).json({ error: 'Invalid input length' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is not configured (missing API key)' });
    return;
  }

  const evalPrompt = `You are a strict but encouraging Dutch (NT2) writing examiner grading at CEFR level ${level}. The essay prompt given to the student was:
"${prompt}"

The student wrote the following Dutch text in response:
"""
${text}
"""

Evaluate it and respond with ONLY raw JSON, no markdown, no code fences, no explanation outside the JSON. Use this exact shape:
{
  "grammarScore": <integer 0-100, accuracy of verb conjugation, word order, articles, agreement>,
  "vocabularyScore": <integer 0-100, range and appropriateness of vocabulary for B2 level>,
  "structureScore": <integer 0-100, paragraph structure, use of connectors, logical flow of argument>,
  "overallFeedback": "<one or two encouraging but honest sentences in Dutch summarizing the writing, at a level the student can understand>",
  "mistakes": [
    {"original": "<the exact incorrect phrase or sentence fragment from the text>", "correction": "<the corrected version>", "explanation": "<short explanation in Dutch of the grammar rule, one sentence>"}
  ],
  "vocabUpgrades": [
    {"basic": "<a simple/repeated word the student used>", "alternatives": ["<B2-level synonym 1>", "<B2-level synonym 2>", "<B2-level synonym 3>"]}
  ]
}

Rules:
- List at most 5 items in "mistakes", prioritizing the most important errors. If there are no grammar mistakes, return an empty array.
- List at most 5 items in "vocabUpgrades", focusing on basic/overused words (like goed, leuk, veel, dingen) that a ${level} writer should vary. If vocabulary is already strong, return an empty array.
- Be realistic: a genuinely strong ${level}-level text should score in the 80s-90s; a text with frequent errors should score much lower. Do not inflate scores.
- All explanations and feedback text must be in Dutch, written simply enough for a B2 learner to understand.`;

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
        max_tokens: 1200,
        messages: [{ role: 'user', content: evalPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      res.status(502).json({ error: 'Feedback service unavailable' });
      return;
    }

    const data = await response.json();
    const responseText = (data.content || []).map((b) => b.text || '').join('').trim();
    const clean = responseText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.status(200).json(result);
  } catch (err) {
    console.error('Writing feedback function error:', err);
    res.status(500).json({ error: 'Evaluation failed' });
  }
};
