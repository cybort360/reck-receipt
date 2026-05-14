import { ImageResponse } from 'next/og';
import { redis } from '@/lib/redis';
import type { LeakageSummary } from '@/lib/fees';

export const alt = 'RektReceipt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface ReceiptData extends LeakageSummary {
  wallet: string;
}

function getGrade(usd: number): { grade: string; color: string } {
  if (usd < 1) return { grade: 'A', color: '#4ade80' };
  if (usd < 5) return { grade: 'B', color: '#4ade80' };
  if (usd < 20) return { grade: 'C', color: '#facc15' };
  if (usd < 50) return { grade: 'D', color: '#f87171' };
  return { grade: 'F', color: '#f87171' };
}

function maskWallet(address: string): string {
  return `${address.slice(0, 1)}••••••••••••`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
      <span style={{ color: '#666666', fontSize: '22px' }}>{label}</span>
      <span style={{ color: '#ffffff', fontSize: '22px' }}>{value}</span>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data: ReceiptData | null = null;
  try {
    data = await redis.get<ReceiptData>(`receipt:${id}`);
  } catch {
    // fall through to placeholder
  }

  const { grade, color: gradeColor } = data ? getGrade(data.totalLeakageUsd) : { grade: '?', color: '#555555' };
  const walletDisplay = data ? maskWallet(data.wallet) : '•••••••••••••';
  const totalLeakageUsd = data?.totalLeakageUsd ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 72px',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ color: '#14f195', fontSize: '18px', letterSpacing: '4px' }}>RECEIPT</span>
          <span style={{ color: '#333333', fontSize: '20px' }}>RektReceipt</span>
        </div>

        {/* Receipt card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            margin: '28px 0',
            border: '1px dashed #2a2a2a',
            borderRadius: '12px',
            background: '#111111',
            padding: '32px 40px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <Row label="Wallet" value={walletDisplay} />
            <Row label="Swaps analyzed" value={data ? String(data.transactionCount) : '—'} />
            <Row label="Total fees" value={data ? `${data.totalFeesSol.toFixed(4)} SOL` : '—'} />
            <Row label="Jito tips" value={data ? `${data.totalJitoTips} txns · ${data.totalJitoTipsSol.toFixed(4)} SOL` : '—'} />
            {/* Grade row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ color: '#666666', fontSize: '22px' }}>Execution grade</span>
              <span style={{ color: gradeColor, fontSize: '22px', fontWeight: 'bold' }}>{grade}</span>
            </div>
          </div>

          {/* Total rekt */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid #1a1a1a', paddingTop: '20px', marginTop: '8px' }}>
            <span style={{ color: '#555555', fontSize: '16px', letterSpacing: '4px' }}>TOTAL REKT</span>
            <span style={{ color: '#f87171', fontSize: '52px', fontWeight: 'bold', lineHeight: 1 }}>
              {data ? `$${totalLeakageUsd.toFixed(2)}` : '$???'}
            </span>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ color: '#333333', fontSize: '18px' }}>rektreceipt.xyz</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
