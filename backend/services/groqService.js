const Groq = require('groq-sdk');

let groqClient = null;

function getClient() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not configured');
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

async function generateReply(systemPrompt, messages) {
  const client = getClient();
  const models = [
    process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ];

  // Sanitize every message: only user/assistant/system roles with a real
  // string content. Prevents 400 errors from undefined/null/object content.
  const safeMessages = (messages || [])
    .filter(m => m && ['user', 'assistant', 'system'].includes(m.role) && typeof m.content === 'string' && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content }));

  for (const model of models) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeMessages,
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });
      return completion.choices[0].message.content;
    } catch (err) {
      console.error(`[groq] Model ${model} failed:`, err.message);
      continue;
    }
  }
  throw new Error('All models failed to generate reply');
}

// Used for structured, one-shot generation (e.g. turning scraped website
// content into a services config) rather than a chat reply. Asks for raw
// JSON and strips markdown fences defensively in case the model adds them.
async function generateJSON(systemPrompt, userPrompt) {
  const client = getClient();
  const models = [
    process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
  ];

  let lastErr = null;
  for (const model of models) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });
      const raw = completion.choices[0].message.content;
      const cleaned = raw.replace(/^```json\s*|```\s*$/g, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.error(`[groq] JSON generation with ${model} failed:`, err.message);
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to generate JSON');
}

module.exports = { generateReply, generateJSON };