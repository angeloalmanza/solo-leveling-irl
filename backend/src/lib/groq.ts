import { env } from './env';
import { logger } from './logger';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };
// La vision usa content come array di parti (testo + image_url)
type VisionMessage = { role: 'system' | 'user'; content: unknown };

interface GroqUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface GroqResponse {
  choices: { message: { content: string } }[];
  usage?: GroqUsage;
  model?: string;
}

const MAX_ATTEMPTS = 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Chiamata low-level a Groq con retry/backoff su 429/5xx ed errori di rete,
 * timeout esplicito e logging di latenza + token.
 */
async function callGroq(body: Record<string, unknown>, timeoutMs: number): Promise<string> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const text = await res.text();
        const retriable = res.status === 429 || res.status >= 500;
        if (retriable && attempt < MAX_ATTEMPTS) {
          const backoff = 400 * attempt;
          logger.warn({ status: res.status, attempt, backoff }, 'Groq retriable error, retrying');
          await sleep(backoff);
          continue;
        }
        throw new Error(`Groq ${res.status}: ${text}`);
      }

      const json = (await res.json()) as GroqResponse;
      logger.info(
        {
          model: json.model ?? body.model,
          latencyMs: Date.now() - started,
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
          totalTokens: json.usage?.total_tokens,
        },
        'Groq call completed'
      );
      return json.choices[0].message.content;
    } catch (err) {
      lastErr = err;
      // Errore di rete/timeout: ritenta una volta
      if (attempt < MAX_ATTEMPTS) {
        const backoff = 400 * attempt;
        logger.warn({ err, attempt, backoff }, 'Groq network error, retrying');
        await sleep(backoff);
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Groq call failed');
}

export interface GroqChatOpts {
  json?: boolean; // forza response_format json_object (default true)
  timeoutMs?: number;
}

/** Completion testuale (default in modalità JSON). */
export async function groqChat(messages: Message[], opts: GroqChatOpts = {}): Promise<string> {
  const { json = true, timeoutMs = 20000 } = opts;
  return callGroq(
    {
      model: TEXT_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1024,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    },
    timeoutMs
  );
}

/** Completion vision (immagini). Model e content passati dal chiamante. */
export async function groqVision(model: string, messages: VisionMessage[], timeoutMs = 30000): Promise<string> {
  return callGroq({ model, messages, max_tokens: 1024 }, timeoutMs);
}
