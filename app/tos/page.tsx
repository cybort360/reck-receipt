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

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 py-12">
      <div className="max-w-[800px] mx-auto flex flex-col gap-10">

        <div className="flex flex-col gap-2">
          <Link href="/" className="text-xl font-bold font-mono hover:opacity-80 transition-opacity">
            RektReceipt
          </Link>
          <h1 className="text-[#00ff88] text-xs tracking-widest font-mono">TERMS OF SERVICE</h1>
          <p className="text-[#374151] text-xs font-mono">Last updated: May 2026</p>
        </div>

        <div className="border-t border-[#1f2937]" />

        <Section title="1. Informational Purpose Only">
          <p>
            RektReceipt is provided as-is for informational and analytical purposes only. The platform
            surfaces on-chain data — including slippage loss, priority fees, Jito tips, and execution
            quality metrics — derived from publicly available Solana blockchain records.
          </p>
          <p>
            Nothing on this platform constitutes financial, investment, trading, or legal advice of
            any kind. You use this information entirely at your own risk.
          </p>
        </Section>

        <Section title="2. No Financial Advice">
          <p>
            RektReceipt does not provide financial advice. Audit results, RektScores, efficiency
            scores, and any other metrics are analytical outputs based on historical on-chain data
            and are not predictions of future performance.
          </p>
          <p>
            Do not make investment decisions based solely on information presented on this platform.
            Always conduct your own research and consult a qualified financial professional before
            making any financial decisions.
          </p>
        </Section>

        <Section title="3. Signal Providers">
          <p>
            Signal providers on RektReceipt are independent third parties. Their track records and
            performance metrics reflect on-chain data only — specifically, historical trade execution
            quality derived from blockchain records.
          </p>
          <p>
            RektReceipt does not endorse, verify, or guarantee the accuracy, completeness, or
            profitability of any signal provider&apos;s signals, advice, or recommendations. Past
            on-chain performance is not indicative of future results.
          </p>
          <p>
            Subscribing to a signal provider grants access to their published signals. It does not
            constitute a financial advisory relationship between you and the provider or between you
            and RektReceipt.
          </p>
        </Section>

        <Section title="4. Subscriptions and Payments">
          <p>
            All subscription fees are processed on-chain in USDC. Subscriptions are
            non-refundable once payment has been confirmed on the blockchain.
          </p>
          <p>
            By initiating a subscription payment you acknowledge that on-chain transactions are
            irreversible and that RektReceipt has no ability to reverse, recall, or refund
            completed transactions.
          </p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>
            You agree not to use RektReceipt for any unlawful purpose, including but not limited to
            market manipulation, fraud, money laundering, or any activity that violates applicable
            law in your jurisdiction.
          </p>
          <p>
            You agree not to attempt to circumvent, disable, or interfere with any security feature
            of the platform, or to access data belonging to other users through unauthorized means.
          </p>
          <p>
            Automated scraping or bulk querying of the platform&apos;s data beyond what is permitted
            by the public API documentation is prohibited without prior written consent.
          </p>
        </Section>

        <Section title="6. Disclaimer of Warranties">
          <p>
            The platform is provided &quot;as is&quot; without warranties of any kind, express or implied.
            RektReceipt makes no warranty that the service will be uninterrupted, error-free, or
            that data will be accurate or complete. On-chain data is sourced from third-party APIs
            and may be subject to delays, inaccuracies, or omissions.
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, RektReceipt and its operators shall
            not be liable for any indirect, incidental, special, consequential, or punitive damages
            arising from your use of or inability to use the platform, including any trading losses
            or financial decisions made in reliance on platform data.
          </p>
        </Section>

        <Section title="8. Governing Law">
          <p>
            RektReceipt operates as a decentralised web application and does not claim a specific
            legal jurisdiction. No specific governing law is asserted. Users are responsible for
            ensuring their use of the platform complies with all laws applicable in their own
            jurisdiction.
          </p>
        </Section>

        <Section title="9. Changes to These Terms">
          <p>
            We may update these terms from time to time. Continued use of the platform after
            changes are published constitutes acceptance of the revised terms. The date at the
            top of this page reflects when the terms were last updated.
          </p>
        </Section>

        <div className="border-t border-[#1f2937] pt-6 flex items-center gap-4">
          <Link href="/" className="text-[#374151] text-xs font-mono hover:text-[#6b7280] transition-colors">
            ← Home
          </Link>
          <Link href="/privacy" className="text-[#374151] text-xs font-mono hover:text-[#6b7280] transition-colors">
            Privacy Policy →
          </Link>
        </div>

      </div>
    </main>
  );
}
