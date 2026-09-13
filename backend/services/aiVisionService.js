const { getChatCompletion } = require('./aiService');
const { executeTool } = require('./aiToolService');

const VISION_SYSTEM_PROMPT = `You are the LifeVault Multimodal Vision-to-Schedule Extraction Engine.
Your task is to analyze the uploaded timetable, routine, syllabus, class schedule, or event flyer image/text and extract all discrete schedule blocks.

Strict Extraction Rules:
1. All times MUST be normalized to 24-hour "HH:mm" format in Indian Standard Time (IST) (e.g. "07:00", "09:30", "14:00", "17:35").
2. Assign each block an appropriate category:
   - "college": classes, labs, university lectures, seminars
   - "study": self-study, assignments, coding, projects, revision
   - "gym": workouts, lifting, cardio, training, sports
   - "work": job shifts, meetings, client work
   - "chores": cleaning, groceries, cooking
   - "rest": lunch breaks, relaxation, sleep
   - "personal": personal hobbies, family time
3. Assign daysOfWeek: array of numbers (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat).
   If days are not explicitly stated, assume weekdays [1, 2, 3, 4, 5].
4. Set recurrence to "weekday", "weekend", "daily", or "weekly".

Output STRICTLY a valid JSON object wrapped in \`\`\`json ... \`\`\` with this exact format:
\`\`\`json
{
  "summary": "Short 1-line summary of what was detected",
  "blocks": [
    {
      "title": "Machine Learning Lab",
      "startTime": "10:00",
      "endTime": "12:00",
      "category": "college",
      "daysOfWeek": [1, 3, 5],
      "recurrence": "weekday"
    }
  ]
}
\`\`\`
Do not include any other markdown text outside the JSON fence.`;

/**
 * Parses JSON block from LLM response string safely.
 */
function extractJsonFromText(rawText) {
  if (!rawText) return null;

  // Try extracting from ```json ... ``` block
  const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = match ? match[1] : rawText;

  try {
    return JSON.parse(candidate);
  } catch (err) {
    // If partial or nested, try finding first { and last }
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
    return null;
  }
}

/**
 * Runs vision or OCR extraction on an attachment to extract schedule blocks.
 */
async function extractScheduleFromAttachment(attachment, userMessage = '', userId) {
  const { attachmentType, mimeType, extractedText, data, originalName } = attachment;

  let messages = [];

  if (attachmentType === 'image' && data) {
    messages = [
      {
        role: 'user',
        content: userMessage || 'Extract all schedule routine blocks from this timetable image.',
        images: [{ mediaType: mimeType || 'image/jpeg', data }],
      },
    ];
  } else {
    // Text-based or parsed PDF document
    const textContent = extractedText || '';
    if (!textContent.trim()) {
      return null;
    }
    messages = [
      {
        role: 'user',
        content: `Document: "${originalName}"\n\nExtracted Text:\n${textContent}\n\nUser Request: ${userMessage || 'Extract timetable blocks.'}`,
      },
    ];
  }

  try {
    const rawReply = await getChatCompletion(messages, VISION_SYSTEM_PROMPT);
    const parsed = extractJsonFromText(rawReply);

    if (!parsed || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      console.warn('[aiVisionService] No valid blocks parsed from vision response.');
      return null;
    }

    // Stage the blocks via aiToolService
    const stagedResult = await executeTool(
      'schedule_batch_create',
      { blocks: parsed.blocks },
      userId,
      false // staged mode
    );

    return {
      summary: parsed.summary || `Extracted ${parsed.blocks.length} schedule blocks from ${originalName || 'uploaded timetable'}.`,
      stagedToolCall: {
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: 'schedule_batch_create',
        arguments: { blocks: stagedResult.arguments.blocks },
        response: stagedResult.response,
        status: 'staged',
      },
    };
  } catch (err) {
    console.error('[aiVisionService] Extraction error:', err.message);
    return null;
  }
}

/**
 * Extracts routine schedule blocks from user prompt text.
 */
async function extractScheduleFromText(textContent, userMessage = '', userId) {
  if (!textContent || !textContent.trim()) return null;

  const messages = [
    {
      role: 'user',
      content: `Routine / Timetable Text:\n"""\n${textContent.trim()}\n"""\n\nUser Instruction: ${userMessage || 'Extract all routine schedule blocks into discrete items.'}`,
    },
  ];

  try {
    const rawReply = await getChatCompletion(messages, VISION_SYSTEM_PROMPT);
    const parsed = extractJsonFromText(rawReply);

    if (!parsed || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      console.warn('[aiVisionService] No valid blocks parsed from text schedule response.');
      return null;
    }

    const stagedResult = await executeTool(
      'schedule_batch_create',
      { blocks: parsed.blocks },
      userId,
      false
    );

    return {
      summary: parsed.summary || `Extracted ${parsed.blocks.length} schedule blocks from routine.`,
      stagedToolCall: {
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: 'schedule_batch_create',
        arguments: { blocks: stagedResult.arguments.blocks },
        response: stagedResult.response,
        status: 'staged',
      },
    };
  } catch (err) {
    console.error('[aiVisionService] extractScheduleFromText error:', err.message);
    return null;
  }
}

module.exports = {
  extractScheduleFromAttachment,
  extractScheduleFromText,
  extractJsonFromText,
  VISION_SYSTEM_PROMPT,
};
