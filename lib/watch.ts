export interface WatchConfig {
  wallet: string;
  email?: string;
  telegramChatId?: string;
  registeredAt: number;
}

function maskWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function calculateGrade(usd: number): string {
  if (usd < 1) return 'A';
  if (usd < 5) return 'B';
  if (usd < 20) return 'C';
  if (usd < 50) return 'D';
  return 'F';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateWeeklySummary(wallet: string, auditResult: any): string {
  const totalLeakageUsd: number = auditResult.totalLeakageUsd ?? 0;
  const totalJitoTipsSol: number = auditResult.totalJitoTipsSol ?? 0;
  const totalLeakageSol: number = auditResult.totalLeakageSol ?? 0;
  const transactionCount: number = auditResult.transactionCount ?? 0;
  const grade: string = auditResult.grade ?? calculateGrade(totalLeakageUsd);

  const solPrice = totalLeakageSol > 0 ? totalLeakageUsd / totalLeakageSol : 0;
  const jitoTipsUsd = totalJitoTipsSol * solPrice;

  return [
    `RektReceipt Weekly Summary`,
    `Wallet: ${maskWallet(wallet)}`,
    ``,
    `Swaps analyzed:  ${transactionCount}`,
    `Total fees paid: $${totalLeakageUsd.toFixed(2)}`,
    `Jito tips paid:  $${jitoTipsUsd.toFixed(2)}`,
    `Execution grade: ${grade}`,
    ``,
    `--`,
    `Sent by RektReceipt — rektreceipt.xyz`,
  ].join('\n');
}
