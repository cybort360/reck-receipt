import { NextRequest, NextResponse } from 'next/server';
import { generalRatelimit } from '@/lib/ratelimit';
import { buildSignalContext } from '@/lib/agent/contextPack';
import { env } from '@/lib/env';

const SYSTEM_PROMPT =
  'You are a Solana execution assistant. You surface on-chain data to help traders make informed decisions. ' +
  'Never recommend buying or selling. Never give price targets, position sizing, or entry and exit signals. ' +
  'Only present what the data shows in plain, direct language. Maximum 4 sentences.';

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success } = await generalRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, { status: 429 });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI analysis unavailable.' }, { status: 503 });
  }

  let body: { providerWallet?: unknown; tokenMint?: unknown; subscriberWallet?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { providerWallet, tokenMint, subscriberWallet } = body;

  if (!providerWallet || typeof providerWallet !== 'string') {
    return NextResponse.json({ error: 'providerWallet is required.' }, { status: 400 });
  }
  if (!tokenMint || typeof tokenMint !== 'string') {
    return NextResponse.json({ error: 'tokenMint is required.' }, { status: 400 });
  }
  if (!subscriberWallet || typeof subscriberWallet !== 'string') {
    return NextResponse.json({ error: 'subscriberWallet is required.' }, { status: 400 });
  }

  const context = await buildSignalContext(providerWallet, tokenMint, subscriberWallet);

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(context, null, 2),
        },
      ],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text().catch(() => '');
    console.error('[AGENT CONTEXT] Anthropic error', anthropicRes.status, err);
    return NextResponse.json({ error: 'Analysis failed.' }, { status: 502 });
  }

  const data = (await anthropicRes.json()) as AnthropicResponse;
  const text = data.content.find((b) => b.type === 'text')?.text ?? '';

  return NextResponse.json({ analysis: text });
}
