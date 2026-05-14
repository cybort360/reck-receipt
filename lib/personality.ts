interface PersonalityInput {
  transactionCount: number;
  totalLeakageUsd: number;
  totalJitoTips: number;
  grade: string;
  avgHourOfDay?: number;
}

interface Personality {
  title: string;
  description: string;
  emoji: string;
}

export function getTraderPersonality(data: PersonalityInput): Personality {
  const { transactionCount, totalLeakageUsd, totalJitoTips, grade } = data;

  if ((grade === 'D' || grade === 'F') && transactionCount > 50) {
    return {
      title: 'Chaos Trader',
      emoji: '🌀',
      description: `You trade like the market owes you something. ${transactionCount} swaps, $${totalLeakageUsd.toFixed(2)} leaked, and zero chill.`,
    };
  }

  if (totalJitoTips > 5) {
    return {
      title: 'Jito Whale',
      emoji: '🐋',
      description: `You've personally funded ${totalJitoTips} MEV bot operations. They appreciate your donations.`,
    };
  }

  if (grade === 'F') {
    return {
      title: 'Degen Supreme',
      emoji: '💀',
      description: `Maximum rekt achieved. $${totalLeakageUsd.toFixed(2)} gone to fees. This is not a drill.`,
    };
  }

  if (transactionCount < 20 && (grade === 'A' || grade === 'B')) {
    return {
      title: 'Diamond Hands',
      emoji: '💎',
      description: `Rare. You trade infrequently and efficiently. Are you even a degen?`,
    };
  }

  if (grade === 'A' && transactionCount > 30) {
    return {
      title: 'Efficiency King',
      emoji: '👑',
      description: `High volume, low leakage. You actually know what you're doing.`,
    };
  }

  return {
    title: 'Ghost Trader',
    emoji: '👻',
    description: `You exist. You trade. Fees happen. C'est la vie.`,
  };
}
