import 'dotenv/config';

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const URL = 'https://api.anthropic.com/v1/messages';

async function call(systemPrompt, messages, { maxTokens = 1024 } = {}) {
  if (!API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data?.content?.map(b => b.text || '').join('') || '';
}

export async function chat(systemPrompt, messages) {
  return call(systemPrompt, messages);
}

export async function parseJSON(systemPrompt, transcript) {
  const text = await call(systemPrompt, [{ role: 'user', content: transcript }]);
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return { _raw: text, _error: 'invalid JSON' };
  }
}
