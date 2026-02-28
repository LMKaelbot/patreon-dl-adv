import OpenAI from 'openai';
import { getDb } from '../db/database.js';

export interface AiResult {
  summary: string;
  topics: string[];
}

function getClient(): { client: OpenAI; model: string } {
  const db = getDb();
  const get = (key: string) => (db.prepare('SELECT value FROM settings WHERE key=?').get(key) as { value: string } | undefined)?.value || '';

  const apiKey = get('ai_api_key');
  const baseURL = get('ai_base_url') || 'https://api.openai.com/v1';
  const model = get('ai_model') || 'gpt-4o-mini';

  const client = new OpenAI({ apiKey: apiKey || 'no-key', baseURL });
  return { client, model };
}

export async function generateSummary(transcript: string): Promise<AiResult> {
  const { client, model } = getClient();

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes video transcripts. Respond with JSON only.',
      },
      {
        role: 'user',
        content: `Summarize the following transcript and extract 5-10 key topics.
Respond with JSON in this exact format: {"summary": "...", "topics": ["topic1", "topic2", ...]}

Transcript:
${transcript.slice(0, 12000)}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(content) as { summary?: string; topics?: string[] };
  return {
    summary: parsed.summary || '',
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
  };
}
