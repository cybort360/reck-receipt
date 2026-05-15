export interface PoisoningResult {
  suspiciousAddresses: Array<{
    address: string;
    matchedAddress: string;
    similarity: string;
  }>;
  count: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectAddressPoisoning(txs: any[]): PoisoningResult {
  const frequency = new Map<string, number>();

  for (const tx of txs) {
    const transfers = tx.nativeTransfers ?? [];
    for (const t of transfers) {
      if (t.fromUserAccount) frequency.set(t.fromUserAccount, (frequency.get(t.fromUserAccount) ?? 0) + 1);
      if (t.toUserAccount) frequency.set(t.toUserAccount, (frequency.get(t.toUserAccount) ?? 0) + 1);
    }
  }

  const addresses = [...frequency.keys()];
  const flagged = new Set<string>();
  const results: PoisoningResult['suspiciousAddresses'] = [];

  for (let i = 0; i < addresses.length; i++) {
    for (let j = i + 1; j < addresses.length; j++) {
      const a = addresses[i];
      const b = addresses[j];

      if (
        a.length >= 8 &&
        b.length >= 8 &&
        a !== b &&
        a.slice(0, 4) === b.slice(0, 4) &&
        a.slice(-4) === b.slice(-4)
      ) {
        const freqA = frequency.get(a) ?? 0;
        const freqB = frequency.get(b) ?? 0;
        const suspicious = freqA <= freqB ? a : b;
        const matched = suspicious === a ? b : a;

        if (!flagged.has(suspicious)) {
          flagged.add(suspicious);
          results.push({
            address: suspicious,
            matchedAddress: matched,
            similarity: 'first 4 + last 4 chars match',
          });
        }
      }
    }
  }

  return { suspiciousAddresses: results, count: results.length };
}
