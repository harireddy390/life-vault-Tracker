async function getChatCompletion(messages, systemPrompt) {
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
      signal: controller.signal,
    });
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') {
      console.error('[aiService] Groq request timed out after 30s');
      const err = new Error('Groq request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    console.error('[aiService] Network error reaching Groq:', networkErr.message);
    const err = new Error('Network error reaching Groq');
    err.code = 'NETWORK_ERROR';
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

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

module.exports = { getChatCompletion };