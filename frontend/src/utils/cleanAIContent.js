/**
 * Utility to filter out or visually hide any raw JSON, `tool_call`, or function argument blocks
 * so that the AI Chat UI renders ONLY natural language text and the custom action pills.
 */

export function cleanAIMessageContent(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Remove fenced code blocks tagged with tool_call, tool-call, tool_calls, or tool
  cleaned = cleaned.replace(/```(?:tool_call|tool-call|tool_calls|tool)[\s\S]*?(?:```|$)/gi, '');

  // 2. Remove fenced code blocks (even json or generic) that contain tool_call structures or arguments
  cleaned = cleaned.replace(/```(?:json)?\s*\{[\s\S]*?"(?:name|tool_name|tool)"\s*:\s*"(?:tasks_|schedule_|vault_|health_|finance_|goals_)[^"]*"[\s\S]*?(?:```|$)/gi, '');
  cleaned = cleaned.replace(/```(?:json)?\s*\{[\s\S]*?"(?:arguments|args|parameters)"\s*:[\s\S]*?(?:```|$)/gi, '');

  // 3. Remove raw un-fenced JSON objects that represent tool calls, e.g.:
  // { "name": "...", "arguments": { ... } }
  cleaned = cleaned.replace(/\{[\s\r\n]*"(?:name|tool_name|tool)"\s*:\s*"[^"]*"[\s\r\n]*,[\s\r\n]*"(?:arguments|args|parameters)"\s*:\s*\{[\s\S]*?\}[\s\r\n]*\}/gi, '');

  // 4. Remove unclosed raw tool JSON blocks at the end of the text during streaming:
  cleaned = cleaned.replace(/\{[\s\r\n]*"(?:name|tool_name|tool)"\s*:\s*"[^"]*"[\s\r\n]*,[\s\r\n]*"(?:arguments|args|parameters)"[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/```(?:tool_call|tool-call|tool_calls|json)[\s\S]*$/gi, '');

  // 5. Remove any leftover tool call XML wrapper tags if any LLM emitted <tool_call>...</tool_call>
  cleaned = cleaned.replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '');

  // 6. Remove internal leaked schedule headings
  cleaned = cleaned.replace(/####\s*📅\s*Weekly Schedule[^\n]*/gi, '');

  // 7. Clean up multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Checks if a code block in Markdown represents a tool call or function invocation payload
 */
export function isToolCallCodeBlock(lang, code) {
  if (!code) return false;
  const l = (lang || '').toLowerCase().trim();
  if (['tool_call', 'tool-call', 'tool_calls', 'tool', 'function_call'].includes(l)) {
    return true;
  }
  const trimmed = code.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    if (
      /"(?:name|tool_name|action|tool)"\s*:\s*"(?:tasks_|schedule_|vault_|health_|finance_|goals_)/i.test(trimmed) ||
      (/"name"\s*:/i.test(trimmed) && /"(?:arguments|args)"\s*:/i.test(trimmed))
    ) {
      return true;
    }
  }
  return false;
}
