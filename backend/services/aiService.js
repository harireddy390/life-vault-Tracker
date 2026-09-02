// AI provider adapter — backed by Groq API.
// Keeps the same robust stream stall detection, error translation, and clean interface.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function checkConfig() {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error('GROQ_API_KEY is not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }
  const model = process.env.GROQ_MODEL;
  if (!model) {
    const err = new Error('GROQ_MODEL is not configured');
    err.code = 'NO_MODEL';
    throw err;
  }
  return model;
}

function buildPayload(model, messages, systemPrompt, stream = false) {
  const formattedMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  return {
    model,
    messages: formattedMessages,
    temperature: 0.7,
    max_tokens: 1024,
    stream,
  };
}

async function getChatCompletion(messages, systemPrompt) {
  const model = checkConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(buildPayload(model, messages, systemPrompt, false)),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    if (networkErr.name === 'AbortError') {
      const err = new Error('Groq request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    console.error('[aiService] Network error reaching Groq:', networkErr.message);
    const err = new Error('Network error reaching Groq');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const bodyText = await response.text();
    console.error('[aiService] Groq API error:', response.status, bodyText);
    const err = new Error('Groq API returned an error');
    err.code = 'PROVIDER_ERROR';
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    console.error('[aiService] Unexpected Groq response shape:', JSON.stringify(data).slice(0, 500));
    const err = new Error('Unexpected response shape from Groq');
    err.code = 'BAD_RESPONSE';
    throw err;
  }
  return reply;
}

async function streamChatCompletion(messages, systemPrompt, onChunk) {
  const model = checkConfig();
  const controller = new AbortController();
  const connectTimeout = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(buildPayload(model, messages, systemPrompt, true)),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(connectTimeout);
    if (networkErr.name === 'AbortError') {
      const err = new Error('Groq request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    console.error('[aiService] Network error reaching Groq:', networkErr.message);
    const err = new Error('Network error reaching Groq');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  clearTimeout(connectTimeout);

  if (!response.ok) {
    const bodyText = await response.text();
    console.error('[aiService] Groq API error:', response.status, bodyText);
    const err = new Error('Groq API returned an error');
    err.code = 'PROVIDER_ERROR';
    err.status = response.status;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullReply = '';
  let streamError = null;

  const STALL_MS = 20_000;
  let stallTimer;

  try {
    while (true) {
      const { done, value } = await new Promise((resolve, reject) => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          reader.cancel().catch(() => {});
          const err = new Error('Groq stream stalled');
          err.code = 'TIMEOUT';
          reject(err);
        }, STALL_MS);
        reader.read().then(resolve, reject);
      });
      clearTimeout(stallTimer);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') continue;

        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue; // partial or malformed SSE chunk
        }

        const token = json.choices?.[0]?.delta?.content;
        if (token) {
          fullReply += token;
          onChunk(token);
        }
      }
      if (streamError) break;
    }
  } finally {
    clearTimeout(stallTimer);
  }

  if (streamError) {
    console.error('[aiService] Groq stream error event:', streamError);
    const err = new Error(streamError);
    err.code = 'PROVIDER_ERROR';
    throw err;
  }
  if (!fullReply) {
    const err = new Error('Empty response from Groq stream');
    err.code = 'BAD_RESPONSE';
    throw err;
  }
  return fullReply;
}

module.exports = { getChatCompletion, streamChatCompletion };