import { ImageResponse } from 'next/og';

export const alt = 'RektReceipt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
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
        {/* Top left — brand + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '80px',
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: '-2px',
              display: 'flex',
            }}
          >
            RektReceipt
          </div>
          <div
            style={{
              fontSize: '28px',
              color: '#555',
              marginTop: '12px',
              display: 'flex',
            }}
          >
            Find out how much Solana has taken from you.
          </div>
        </div>

        {/* Center — mock receipt card */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderWidth: '2px',
              borderStyle: 'dashed',
              borderColor: '#2a2a2a',
              borderRadius: '16px',
              background: '#111111',
              padding: '40px 56px',
              width: '500px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: '#14f195',
                letterSpacing: '5px',
                marginBottom: '28px',
                display: 'flex',
              }}
            >
              RECEIPT
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '20px',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: '#1a1a1a',
              }}
            >
              <span style={{ color: '#555', fontSize: '22px' }}>Execution Grade</span>
              <span style={{ color: 'white', fontSize: '22px', fontWeight: 'bold' }}>?</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: '20px',
              }}
            >
              <span style={{ color: '#555', fontSize: '13px', letterSpacing: '3px' }}>
                TOTAL REKT
              </span>
              <span style={{ color: '#f87171', fontSize: '32px', fontWeight: 'bold' }}>???</span>
            </div>
          </div>
        </div>

        {/* Bottom right — domain */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ color: '#333', fontSize: '20px' }}>rektreceipt.xyz</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
