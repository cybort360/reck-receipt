import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'noreply@rektreceipt.xyz';

// TODO: Email collection needs to be added to the payment flow before this
// can send real emails. Currently we only have the wallet address at confirmation
// time — no email address is collected during checkout.
export async function sendPaymentConfirmation(
  to: string,
  plan: string,
  walletShort: string,
  amount: number,
): Promise<void> {
  console.log(`[EMAIL SKIP] would send to: ${to} — plan: ${plan}, wallet: ${walletShort}, amount: $${amount} USDC`);
  return;

  // eslint-disable-next-line no-unreachable
  await resend.emails.send({
    from: FROM,
    to,
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
