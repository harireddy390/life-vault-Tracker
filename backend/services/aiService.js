// AI Provider Adapter — Unified interface supporting Groq, Google Gemini,
// and Anthropic Claude, with streaming, multimodal vision, and fallback.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Normalizes Anthropic model names
 */
function sanitizeAnthropicModel(model) {
  if (!model) return 'claude-3-5-sonnet-20241022';
  const clean = model.trim().toLowerCase();
  if (clean.includes('claude-sonnet-5') || clean.includes('claude-5')) {
    return 'claude-3-5-sonnet-20241022';
  }
  if (clean === 'claude-3-sonnet' || clean === 'claude-sonnet') {
    return 'claude-3-5-sonnet-20241022';
  }
  if (clean === 'claude-3-haiku' || clean === 'claude-haiku') {
    return 'claude-3-haiku-20240307';
  }
  return model;
}

/**
 * Normalizes Groq model names
 */
function sanitizeGroqModel(model, hasImages = false) {
  if (hasImages) {
    // Qwen 3.6-27b is the active multimodal vision model on Groq
    return process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b';
  }
  if (!model) {
    return 'openai/gpt-oss-120b';
  }
  return model.trim();
}

/**
 * Detects the active AI provider based on environment and preference.
 */
function getActiveProvider() {
  const configured = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  if (configured === 'gemini' || configured === 'groq' || configured === 'anthropic') {
    return configured;
  }
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }
  if (process.env.GROQ_API_KEY) {
    return 'groq';
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  const err = new Error('No AI API key is configured on the server.');
  err.code = 'NO_API_KEY';
  throw err;
}

// =========================================================================
// GOOGLE GEMINI ADAPTER
// =========================================================================

function formatGeminiContents(messages) {
  const contents = [];

  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const parts = [];

    const images = m.images || (m.image ? [m.image] : []);
    for (const img of images) {
      parts.push({
        inline_data: {
          mime_type: img.mediaType || 'image/jpeg',
          data: img.data,
        },
      });
    }

    if (m.content) {
      parts.push({ text: m.content });
    } else if (parts.length === 0) {
      parts.push({ text: ' ' });
    }

    contents.push({ role, parts });
  }

  return contents;
}

async function streamGemini(messages, systemPrompt, onChunk) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `${GEMINI_URL}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const controller = new AbortController();
  const connectTimeout = setTimeout(() => controller.abort(), 35_000);

  const bodyPayload = {
    contents: formatGeminiContents(messages),
  };

  if (systemPrompt) {
    bodyPayload.system_instruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(connectTimeout);
    if (networkErr.name === 'AbortError') {
      const err = new Error('Gemini request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    const err = new Error('Network error reaching Gemini');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  clearTimeout(connectTimeout);

  if (!response.ok) {
    const bodyText = await response.text();
    console.error('[aiService:Gemini] Error:', response.status, bodyText);
    const err = new Error('Gemini API returned an error');
    err.code = 'PROVIDER_ERROR';
    err.status = response.status;
    err.details = bodyText;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullReply = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
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

        const candidate = json.candidates?.[0];
        const partText = candidate?.content?.parts?.[0]?.text;
        if (partText) {
          fullReply += partText;
          onChunk(partText);
        }
      }
    }
  } catch (streamErr) {
    if (streamErr.name === 'AbortError') return fullReply;
    throw streamErr;
  }

  return fullReply;
}

// =========================================================================
// GROQ ADAPTER
// =========================================================================

function formatGroqMessages(messages, systemPrompt) {
  const formatted = [];
  if (systemPrompt) {
    formatted.push({ role: 'system', content: systemPrompt });
  }

  for (const m of messages) {
    const images = m.images || (m.image ? [m.image] : []);
    if (images.length === 0) {
      formatted.push({ role: m.role, content: m.content || ' ' });
    } else {
      const contentParts = [];
      for (const img of images) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mediaType};base64,${img.data}`,
          },
        });
      }
      contentParts.push({
        type: 'text',
        text: m.content || 'Please analyze this image.',
      });
      formatted.push({ role: m.role, content: contentParts });
    }
  }
  return formatted;
}

async function streamGroq(messages, systemPrompt, onChunk) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('GROQ_API_KEY is not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const hasImages = messages.some((m) => (m.images && m.images.length > 0) || m.image);
  const model = sanitizeGroqModel(process.env.GROQ_MODEL, hasImages);
  // Keep max_tokens within Groq OTPM limit for vision models
  const maxTokens = hasImages ? 800 : 2048;

  const controller = new AbortController();
  const connectTimeout = setTimeout(() => controller.abort(), 35_000);

  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formatGroqMessages(messages, systemPrompt),
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(connectTimeout);
    if (networkErr.name === 'AbortError') {
      const err = new Error('AI request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    console.error('[aiService:Groq] Network error:', networkErr.message);
    const err = new Error('Network error reaching AI provider');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  clearTimeout(connectTimeout);

  if (!response.ok) {
    const bodyText = await response.text();
    console.error('[aiService:Groq] HTTP error:', response.status, bodyText);
    const err = new Error('Groq API returned an error');
    err.code = 'PROVIDER_ERROR';
    err.status = response.status;
    err.details = bodyText;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullReply = '';

  const STALL_MS = 25_000;
  let stallTimer;

  try {
    while (true) {
      const { done, value } = await new Promise((resolve, reject) => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          reader.cancel().catch(() => {});
          const err = new Error('Stream stalled');
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
        if (!payload || payload === '[DONE]') continue;

        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const token = json.choices?.[0]?.delta?.content;
        if (token) {
          fullReply += token;
          onChunk(token);
        }
      }
    }
  } finally {
    clearTimeout(stallTimer);
  }

  return fullReply;
}

// =========================================================================
// ANTHROPIC ADAPTER
// =========================================================================

function formatAnthropicMessages(messages) {
  return messages.map((m) => {
    if (!m.images || m.images.length === 0) {
      if (m.image) {
        return {
          role: m.role,
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: m.image.mediaType, data: m.image.data },
            },
            { type: 'text', text: m.content || 'What do you see in this image?' },
          ],
        };
      }
      return { role: m.role, content: m.content || ' ' };
    }

    const contentBlocks = [];
    for (const img of m.images) {
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.data },
      });
    }
    contentBlocks.push({
      type: 'text',
      text: m.content || 'Please analyze the attached image(s).',
    });
    return { role: m.role, content: contentBlocks };
  });
}

async function streamAnthropic(messages, systemPrompt, onChunk) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY is not configured');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const model = sanitizeAnthropicModel(process.env.ANTHROPIC_MODEL);
  const controller = new AbortController();
  const connectTimeout = setTimeout(() => controller.abort(), 35_000);

  let response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        stream: true,
        messages: formatAnthropicMessages(messages),
      }),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(connectTimeout);
    if (networkErr.name === 'AbortError') {
      const err = new Error('AI request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    const err = new Error('Network error reaching Anthropic');
    err.code = 'NETWORK_ERROR';
    throw err;
  }
  clearTimeout(connectTimeout);

  if (!response.ok) {
    const bodyText = await response.text();
    console.error('[aiService:Anthropic] HTTP error:', response.status, bodyText);
    const err = new Error('Anthropic API returned an error');
    err.code = 'PROVIDER_ERROR';
    err.status = response.status;
    err.details = bodyText;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullReply = '';
  let streamError = null;

  const STALL_MS = 25_000;
  let stallTimer;

  try {
    while (true) {
      const { done, value } = await new Promise((resolve, reject) => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          reader.cancel().catch(() => {});
          const err = new Error('Stream stalled');
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
    const err = new Error(streamError);
    err.code = 'PROVIDER_ERROR';
    throw err;
  }

  return fullReply;
}

// =========================================================================
// UNIFIED PUBLIC AI API WITH AUTOMATIC FALLBACK
// =========================================================================

async function streamChatCompletion(messages, systemPrompt, onChunk) {
  const provider = getActiveProvider();

  try {
    if (provider === 'gemini') {
      return await streamGemini(messages, systemPrompt, onChunk);
    } else if (provider === 'groq') {
      return await streamGroq(messages, systemPrompt, onChunk);
    } else {
      return await streamAnthropic(messages, systemPrompt, onChunk);
    }
  } catch (primaryErr) {
    console.warn(`[aiService] ${provider} failed (${primaryErr.message}). Attempting fallback...`);

    // Fallback order: Gemini -> Groq -> Anthropic
    if (provider !== 'groq' && process.env.GROQ_API_KEY) {
      return await streamGroq(messages, systemPrompt, onChunk);
    }
    if (provider !== 'gemini' && process.env.GEMINI_API_KEY) {
      return await streamGemini(messages, systemPrompt, onChunk);
    }
    if (provider !== 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      return await streamAnthropic(messages, systemPrompt, onChunk);
    }

    throw primaryErr;
  }
}

async function getChatCompletion(messages, systemPrompt) {
  let reply = '';
  await streamChatCompletion(messages, systemPrompt, (chunk) => {
    reply += chunk;
  });
  return reply;
}

module.exports = {
  getChatCompletion,
  streamChatCompletion,
  getActiveProvider,
};