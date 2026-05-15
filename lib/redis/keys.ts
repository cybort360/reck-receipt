// Single source of truth for all Redis keys. Never write key strings elsewhere.

export const KEYS = {
  audit: (wallet: string) => `rr:v1:audit:${wallet}`,
  userPro: (wallet: string) => `rr:v1:user:pro:${wallet}`,
  userWatch: (wallet: string) => `rr:v1:user:watch:${wallet}`,
  refCode: (code: string) => `rr:v1:ref:code:${code}`,
  refWallet: (wallet: string) => `rr:v1:ref:wallet:${wallet}`,
  payment: (amount: string) => `rr:v1:payment:${amount}`,
  tokenTraders: (mint: string) => `rr:v1:token:traders:${mint}`,
  tokenRugs: (mint: string) => `rr:v1:token:rugs:${mint}`,
  lbGlobal: () => `rr:v1:lb:global`,
  lbWeekly: () => `rr:v1:lb:weekly`,
  lbGraveyard: () => `rr:v1:lb:graveyard`,
  history: (wallet: string) => `rr:v1:history:${wallet}`,
  shareByWallet: (wallet: string) => `rr:v1:share:wallet:${wallet}`,
  price: (dateISO: string) => `rr:v1:price:${dateISO}`,
  auditedWallets: () => `rr:v1:idx:audited-wallets`,
  rektScore: (wallet: string) => `rr:v1:score:${wallet}`,
  scoreIndex: () => `rr:v1:idx:scores`,
  signalProvider: (wallet: string) => `rr:v1:signal:provider:${wallet}`,
  signalCalls: (wallet: string) => `rr:v1:signal:calls:${wallet}`,
  signalIndex: () => `rr:v1:idx:signal-providers`,
  subscription: (subscriberWallet: string, providerWallet: string) =>
    `rr:v1:signal:sub:${subscriberWallet}:${providerWallet}`,
  providerEarnings: (wallet: string) => `rr:v1:signal:earnings:${wallet}`,
  subscriptionPayment: (amount: string) => `rr:v1:signal:payment:${amount}`,
  signalPayout: (wallet: string) => `rr:v1:signal:payout:${wallet}`,
};
