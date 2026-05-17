import { Resend } from 'resend';
import { redis } from './redis';
import { KEYS } from './redis/keys';

const FROM = 'noreply@rektreceipt.xyz';

export async function sendPaymentConfirmation(
  wallet: string,
  plan: string,
  walletShort: string,
  amount: number,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[EMAIL SKIP] RESEND_API_KEY not set — plan: ${plan}, wallet: ${walletShort}, amount: $${amount}`);
    return;
  }

  const email = await redis.get<string>(KEYS.userEmail(wallet));
  if (!email) {
    console.log(`[EMAIL SKIP] no email on file for ${walletShort} — plan: ${plan}, amount: $${amount} USDC`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `RektReceipt — ${plan} plan activated`,
    text: [
      `Your ${plan} subscription is now active.`,
      `Wallet: ${walletShort}`,
      `Amount paid: $${amount} USDC`,
      `Your access expires in 30 days.`,
      `Visit rektreceipt.xyz to get started.`,
    ].join('\n'),
  });
}
