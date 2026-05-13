import { ImageResponse } from 'next/og';
import { fetchSwapTransactions } from '@/lib/helius';
import { calculateLeakage } from '@/lib/fees';
import { getSolPrice } from '@/lib/price';

export const alt = 'RektReceipt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function getGrade(usd: number): { grade: string; color: string } {
  if (usd < 1) return { grade: 'A', color: '#4ade80' };
  if (usd < 5) return { grade: 'B', color: '#4ade80' };
  if (usd < 20) return { grade: 'C', color: '#facc15' };
  if (usd < 50) return { grade: 'D', color: '#f87171' };
  return { grade: 'F', color: '#f87171' };
}

function truncateWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default async function Image({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;

  let grade = '?';
  let gradeColor = '#555555';
  let totalLeakageUsd = 0;
  let hasData = false;

  try {
    const [txs, solPriceUsd] = await Promise.all([
      fetchSwapTransactions(wallet),
      getSolPrice(),
    ]);
    const summary = calculateLeakage(txs, solPriceUsd);
    const gradeResult = getGrade(summary.totalLeakageUsd);
    grade = gradeResult.grade;
    gradeColor = gradeResult.color;
    totalLeakageUsd = summary.totalLeakageUsd;
    hasData = true;
  } catch {
    // fall through to placeholder values
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px',
        }}
      >
        {/* Top left — brand */}
        <div style={{ display: 'flex' }}>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: '-1px',
            }}
          >
            RektReceipt
          </span>
        </div>

        {/* Center — grade + total */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            gap: '80px',
          }}
        >
          {/* Grade */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '200px',
                fontWeight: 'bold',
                color: gradeColor,
                lineHeight: 1,
              }}
            >
              {grade}
            </span>
            <span
              style={{
                fontSize: '18px',
                color: '#555555',
                letterSpacing: '3px',
                marginTop: '8px',
                display: 'flex',
              }}
            >
              EXECUTION GRADE
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              width: '1px',
              height: '220px',
              background: '#2a2a2a',
            }}
          />

          {/* Total rekt */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <span
              style={{
                fontSize: '16px',
                color: '#555555',
                letterSpacing: '4px',
                display: 'flex',
              }}
            >
              TOTAL REKT
            </span>
            <span
              style={{
                fontSize: '96px',
                fontWeight: 'bold',
                color: '#f87171',
                lineHeight: 1,
                display: 'flex',
              }}
            >
              {hasData ? `$${totalLeakageUsd.toFixed(2)}` : '$???'}
            </span>
          </div>
        </div>

        {/* Bottom — wallet + domain */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <span style={{ fontSize: '20px', color: '#333333', fontFamily: 'monospace' }}>
            {truncateWallet(wallet)}
          </span>
          <span style={{ fontSize: '20px', color: '#333333' }}>
            rektreceipt.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
