import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { KEYS } from '@/lib/redis/keys';

const THREE_DAYS_SECONDS = 259200;

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Email sending requires collecting subscriber email at subscription
  // time. Currently only the wallet address is known — add an email field to
  // the subscription checkout flow before enabling real notifications here.

  const members = await redis.smembers<string[]>(KEYS.subscriptionIndex());

  let warned = 0;
  let expired = 0;
  let active = 0;

  for (const member of members) {
    const colonIdx = member.indexOf(':');
    if (colonIdx === -1) continue;
    const subscriberWallet = member.slice(0, colonIdx);
    const providerWallet = member.slice(colonIdx + 1);

    const ttl = await redis.ttl(KEYS.subscription(subscriberWallet, providerWallet));

    if (ttl === -2) {
      // Key no longer exists — remove from index
      await redis.srem(KEYS.subscriptionIndex(), member);
      expired++;
      continue;
    }

    if (ttl > 0 && ttl <= THREE_DAYS_SECONDS) {
      const daysLeft = Math.floor(ttl / 86400);
      console.log(
        `[EXPIRY WARNING] wallet: ${subscriberWallet} provider: ${providerWallet} expires in: ${daysLeft} days`,
      );
      warned++;
      continue;
    }

    active++;
  }

  return NextResponse.json({ warned, expired, active, total: members.length });
}
