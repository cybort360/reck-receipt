import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const WALLETS = [
  '4WPTQA7BB4iRdrPhgNpJihGcxKh8T43gLjMn5PbEVfQw',
  '71CPXu3TvH3iUKaY1bNkAAow24k6tjH473SsKprQBABC',
  'DjM7Tu7whh6P3pGVBfDzwXAx2zaw51GJWrJE3PwtuN7s',
  '242p259rfsb9J3X3mhnWw35UM2hfMDg14G47CQ66s9ZW',
  'BC8yiFFQWFEKrEEj75zYsuK3ZDCfv6QEeMRif9oZZ9TW',
  '8i5U2uNBEuTc4zskYP14zbebDg2RSwrrG8REhEnJb97K',
  'GH9yk8vgFvHnAD8JZqXxr3hBN1Lr1mJ9NPzrP5mVqiJe',
  'B32QbbdDAyhvUQzjcaM5j6ZVKwjCxAwGH5Xgvb9SJqnC',
  '7E9jfxCczubz4FXkkVKzUMHXGwzJxyppC4m7y3ew8ATg',
  'BTf4A2exGK9BCVDNzy65b9dUzXgMqB4weVkvTMFQsadd',
  'MRiYA4oN3158fCV8evhuCofrDzbHyYvYnGZUDJvoCsa',
  'aDfntoG5VYUTAaVybwWf3S3m2RQrxTNGzsAxT4sGxxJ',
  'hnu5iBK8UoHb51UFsH1RYTUAYdrhjHvV5YMTf9T1CYN',
  '31tBDGKNmwcXLkCxWJvU6vsgw5MqH4k5ntjECFpwxFFV',
];

interface SeedResult {
  seeded: number;
  failed: string[];
  total: number;
}

async function main() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    console.error('ADMIN_SECRET not set in .env.local');
    process.exit(1);
  }

  console.log(`Seeding ${WALLETS.length} wallets...`);

  const res = await fetch('http://localhost:3000/api/admin/seed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': secret,
    },
    body: JSON.stringify({ wallets: WALLETS }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Request failed (${res.status}):`, text);
    process.exit(1);
  }

  const result: SeedResult = await res.json();

  console.log(`\nResult:`);
  console.log(`  Total:  ${result.total}`);
  console.log(`  Seeded: ${result.seeded}`);
  console.log(`  Failed: ${result.failed.length}`);

  if (result.failed.length > 0) {
    console.log('\nFailed wallets:');
    for (const wallet of result.failed) {
      console.log(`  - ${wallet}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
