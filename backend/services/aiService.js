// AI provider adapter — backed by Anthropic (Claude). The rest of the app
// only knows "ask the AI something and get text back, optionally with an
// image attached" — this is the only file that knows Anthropic's actual
// wire format.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function checkConfig() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY is not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    const err = new Error('ANTHROPIC_MODEL is not configured');
    err.code = 'NO_MODEL';
    throw err;
  }
  return model;
}

// Only a message with an attached image needs the array content-block
// form — plain text messages stay as a plain string, which Anthropic
// also accepts.
function toAnthropicMessages(messages) {
  return messages.map((m) => {
    if (!m.image) return { role: m.role, content: m.content };
    return {
      role: m.role,
      content: [
        { type: 'image', source: { type: 'base64', media_type: m.image.mediaType, data: m.image.data } },
        { type: 'text', text: m.content || 'What do you see in this image?' },
      ],
    };
  });
}

async function getChatCompletion(messages, systemPrompt) {
  const model = checkConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages: toAnthropicMessages(messages) }),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    if (networkErr.name === 'AbortError') {
      const err = new Error('Claude request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    console.error('[aiService] Network error reaching Anthropic:', networkErr.message);
    const err = new Error('Network error reaching Anthropic');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const bodyText = await response.text();
    console.error('[aiService] Anthropic API error:', response.status, bodyText);
    const err = new Error('Anthropic API returned an error');
    err.code = 'PROVIDER_ERROR';
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text;
  if (!reply) {
    console.error('[aiService] Unexpected Anthropic response shape:', JSON.stringify(data).slice(0, 500));
    const err = new Error('Unexpected response shape from Anthropic');
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
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, stream: true, messages: toAnthropicMessages(messages) }),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(connectTimeout);
    if (networkErr.name === 'AbortError') {
      const err = new Error('Claude request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    console.error('[aiService] Network error reaching Anthropic:', networkErr.message);
    const err = new Error('Network error reaching Anthropic');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  clearTimeout(connectTimeout);

  if (!response.ok) {
    const bodyText = await response.text();
    console.error('[aiService] Anthropic API error:', response.status, bodyText);
    const err = new Error('Anthropic API returned an error');
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
          const err = new Error('Claude stream stalled');
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

        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          const token = json.delta.text;
          if (token) {
            fullReply += token;
            onChunk(token);
          }
        } else if (json.type === 'error') {
          streamError = json.error?.message || 'Anthropic stream error';
        }
      }
      if (streamError) break;
    }
  } finally {
    clearTimeout(stallTimer);
  }

  if (streamError) {
    console.error('[aiService] Anthropic stream error event:', streamError);
    const err = new Error(streamError);
    err.code = 'PROVIDER_ERROR';
    throw err;
  }
  if (!fullReply) {
    const err = new Error('Empty response from Claude stream');
    err.code = 'BAD_RESPONSE';
    throw err;
  }
  return fullReply;
}

module.exports = { getChatCompletion, streamChatCompletion };