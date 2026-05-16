import Link from 'next/link';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-white font-bold font-mono text-sm tracking-widest uppercase">
        {title}
      </h2>
      <div className="text-[#6b7280] text-sm font-mono leading-relaxed flex flex-col gap-2">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-12">
      <div className="max-w-[800px] mx-auto flex flex-col gap-10">

        <div className="flex flex-col gap-2">
          <Link href="/" className="text-xl font-bold font-mono hover:opacity-80 transition-opacity">
            RektReceipt
          </Link>
          <h1 className="text-[#00ff88] text-xs tracking-widest font-mono">PRIVACY POLICY</h1>
          <p className="text-[#374151] text-xs font-mono">Last updated: May 2026</p>
        </div>

        <div className="border-t border-[#1f2937]" />

        <Section title="1. What We Collect">
          <p>
            RektReceipt collects Solana wallet addresses that you voluntarily submit for auditing.
            When you request an audit, we fetch publicly available on-chain transaction data
            associated with that address from the Solana blockchain via third-party APIs (Helius,
            Birdeye).
          </p>
          <p>
            We do not collect your name, email address, IP address, or any other personally
            identifiable information beyond what you explicitly provide through the platform.
          </p>
        </Section>

        <Section title="2. How We Use Your Data">
          <p>
            Audit results — including slippage loss estimates, priority fees paid, Jito tips, and
            execution quality scores — are computed from on-chain data and stored temporarily to
            power the platform&apos;s features such as the leaderboard, RektScore, and signal
            provider eligibility checks.
          </p>
          <p>
            Wallet addresses submitted through the signal provider programme are stored to maintain
            provider profiles and track on-chain performance history. This data is used solely to
            operate the platform.
          </p>
        </Section>

        <Section title="3. Data Retention">
          <p>
            Audit results are stored in Redis with a 7-day TTL and are automatically deleted after
            that period. Signal provider data and published signal calls are retained for as long as
            the provider account is active.
          </p>
          <p>
            Authentication session tokens expire after 24 hours. Nonces used during wallet signing
            expire after 5 minutes and are deleted immediately upon use.
          </p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>
            We use the following third-party services to operate the platform:
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1 pl-2">
            <li>Helius — Solana RPC and transaction indexing</li>
            <li>Birdeye — historical token price data</li>
            <li>Jupiter — real-time token price data</li>
            <li>Upstash Redis — ephemeral data storage</li>
            <li>Vercel — application hosting and edge delivery</li>
          </ul>
          <p>
            Each of these services operates under its own privacy policy. We do not control how
            they handle data passed through their APIs.
          </p>
        </Section>

        <Section title="5. We Do Not Sell Your Data">
          <p>
            We do not sell, rent, or trade your wallet address or any associated audit data to
            third parties for any purpose, including advertising or analytics.
          </p>
        </Section>

        <Section title="6. Payments">
          <p>
            Subscription payments for signal provider access are processed entirely on-chain in
            USDC on the Solana network. We do not collect, store, or process payment card
            numbers, bank account details, or any off-chain payment credentials.
          </p>
          <p>
            On-chain transactions are public by nature. Subscribing to a signal provider creates
            a verifiable on-chain record of the transaction.
          </p>
        </Section>

        <Section title="7. Cookies and Tracking">
          <p>
            RektReceipt does not use cookies, browser fingerprinting, or third-party tracking
            scripts. Session tokens are stored in React state only and are not persisted to
            localStorage, sessionStorage, or cookies.
          </p>
        </Section>

        <Section title="8. Public Data">
          <p>
            All data surfaced by RektReceipt originates from the public Solana blockchain. Wallet
            addresses, transaction histories, and on-chain metrics are publicly visible to anyone
            and are not made more private by their presence or absence on this platform.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this policy from time to time. Continued use of the platform after
            changes are published constitutes acceptance of the revised policy. The date at the
            top of this page reflects when the policy was last updated.
          </p>
        </Section>

        <div className="border-t border-[#1f2937] pt-6 flex items-center gap-4">
          <Link href="/" className="text-[#374151] text-xs font-mono hover:text-[#6b7280] transition-colors">
            ← Home
          </Link>
          <Link href="/tos" className="text-[#374151] text-xs font-mono hover:text-[#6b7280] transition-colors">
            Terms of Service →
          </Link>
        </div>

      </div>
    </main>
  );
}
