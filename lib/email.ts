import { Resend } from 'resend';
import { redis } from './redis';
import { KEYS } from './redis/keys';

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'noreply@rektreceipt.xyz';

export async function sendPaymentConfirmation(
  wallet: string,
  plan: string,
  walletShort: string,
  amount: number,
): Promise<void> {
  const email = await redis.get<string>(KEYS.userEmail(wallet));

  if (!email) {
    // TODO: email collection needs to be added to the payment flow before this
    // can send real emails — store email at checkout time via /api/user/email.
    console.log(`[EMAIL SKIP] no email on file for ${walletShort} — plan: ${plan}, amount: $${amount} USDC`);
    return;
  }

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
