export const MEDAL_NAMES: Record<number, string> = {
  1: 'Herald',
  2: 'Guardian',
  3: 'Crusader',
  4: 'Archon',
  5: 'Legend',
  6: 'Ancient',
  7: 'Divine',
  8: 'Immortal',
};

export const MEDAL_COLORS: Record<number, string> = {
  0: '#5c6b7a',
  1: '#6b7280',
  2: '#16a34a',
  3: '#84cc16',
  4: '#38bdf8',
  5: '#6366f1',
  6: '#a855f7',
  7: '#f43f5e',
  8: '#fbbf24',
};

export const MEDAL_MMR_RANGES: Record<number, [number, number]> = {
  1: [0, 769],
  2: [770, 1539],
  3: [1540, 2309],
  4: [2310, 3079],
  5: [3080, 3849],
  6: [3850, 4609],
  7: [4610, 5429],
  8: [5430, 10000],
};

export const MEDAL_GLOW: Record<number, string> = {
  0: 'rgba(92,107,122,0.4)',
  1: 'rgba(107,114,128,0.5)',
  2: 'rgba(22,163,74,0.55)',
  3: 'rgba(132,204,22,0.55)',
  4: 'rgba(56,189,248,0.55)',
  5: 'rgba(99,102,241,0.55)',
  6: 'rgba(168,85,247,0.55)',
  7: 'rgba(244,63,94,0.6)',
  8: 'rgba(251,191,36,0.7)',
};

export interface MedalInfo {
  name: string;
  color: string;
  glow: string;
  major: number;
  minor: number;
}

export function getMedalFromRankTier(rankTier?: number | null): MedalInfo {
  if (!rankTier || rankTier <= 0) {
    return { name: 'Uncalibrated', color: MEDAL_COLORS[0], glow: MEDAL_GLOW[0], major: 0, minor: 0 };
  }
  const major = Math.floor(rankTier / 10);
  const minor = rankTier % 10;
  const base = MEDAL_NAMES[major] || 'Unknown';
  let name = base;
  if (minor > 0 && major < 8) name = `${base} ${minor}`;
  return {
    name,
    color: MEDAL_COLORS[major] || MEDAL_COLORS[0],
    glow: MEDAL_GLOW[major] || MEDAL_GLOW[0],
    major,
    minor,
  };
}

export function getMedalFromMmr(mmr: number): MedalInfo {
  for (let major = 8; major >= 1; major--) {
    const [min, max] = MEDAL_MMR_RANGES[major];
    if (mmr >= min && mmr <= max) {
      const width = max - min;
      const offset = mmr - min;
      const minor = Math.max(1, Math.min(5, Math.ceil((offset / width) * 5)));
      const base = MEDAL_NAMES[major];
      return {
        name: major < 8 ? `${base} ${minor}` : base,
        color: MEDAL_COLORS[major],
        glow: MEDAL_GLOW[major],
        major,
        minor,
      };
    }
  }
  return { name: 'Uncalibrated', color: MEDAL_COLORS[0], glow: MEDAL_GLOW[0], major: 0, minor: 0 };
}

export const ROLE_NAMES: Record<string, string> = {
  carry: 'Керри',
  mid: 'Мид',
  offlane: 'Оффлейн',
  support: 'Саппорт',
  hard_support: 'Хард саппорт',
};

export const ROLE_COLORS: Record<string, string> = {
  carry: '#ef4444',
  mid: '#3b82f6',
  offlane: '#22c55e',
  support: '#f59e0b',
  hard_support: '#a855f7',
};

export function getRoleName(role?: string | null): string {
  return ROLE_NAMES[role || 'carry'] || 'Керри';
}

export function getRoleColor(role?: string | null): string {
  return ROLE_COLORS[role || 'carry'] || ROLE_COLORS.carry;
}

export function getMmrColor(mmr: number): string {
  if (mmr < 770) return MEDAL_COLORS[1];
  if (mmr < 1540) return MEDAL_COLORS[2];
  if (mmr < 2310) return MEDAL_COLORS[3];
  if (mmr < 3080) return MEDAL_COLORS[4];
  if (mmr < 3850) return MEDAL_COLORS[5];
  if (mmr < 4610) return MEDAL_COLORS[6];
  if (mmr < 5430) return MEDAL_COLORS[7];
  return MEDAL_COLORS[8];
}

export function getWinrateColor(wr: number): string {
  if (wr >= 60) return '#16a34a';
  if (wr >= 52) return '#22c55e';
  if (wr >= 48) return '#f59e0b';
  return '#ef4444';
}

export function getWinrateGradient(wr: number): string {
  if (wr >= 60) return 'linear-gradient(180deg, #22c55e, #15803d)';
  if (wr >= 52) return 'linear-gradient(180deg, #84cc16, #4d7c0f)';
  if (wr >= 48) return 'linear-gradient(180deg, #f59e0b, #b45309)';
  return 'linear-gradient(180deg, #ef4444, #991b1b)';
}

export const MEDAL_ROMAN: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

export const API_BASE = 'http://localhost:8080';
export const WS_URL = 'http://localhost:8080/ws';
