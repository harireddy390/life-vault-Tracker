// AI provider adapter. The rest of the app only knows "ask the AI something
// and get text back" — swapping providers later means editing only this file.

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
    });
  } catch (networkErr) {
    console.error('[aiService] Network error reaching Groq:', networkErr.message);
    const err = new Error('Network error reaching Groq');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (!response.ok) {
    const bodyText = await response.text();
    // Log full detail server-side only — never sent to the frontend
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