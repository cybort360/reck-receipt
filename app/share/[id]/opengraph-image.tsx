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

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let grade = '?';
  let gradeColor = '#555555';
  let totalLeakageUsd = 0;
  let walletDisplay = '•••••••••••••';
  let hasData = false;

  try {
    const data = await redis.get<ReceiptData>(`receipt:${id}`);
    if (data) {
      const gradeResult = getGrade(data.totalLeakageUsd);
      grade = gradeResult.grade;
      gradeColor = gradeResult.color;
      totalLeakageUsd = data.totalLeakageUsd;
      walletDisplay = maskWallet(data.wallet);
      hasData = true;
    }
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

        {/* Bottom — masked wallet + domain */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <span style={{ fontSize: '20px', color: '#333333', fontFamily: 'monospace' }}>
            {walletDisplay}
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
