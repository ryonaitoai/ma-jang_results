// Default rule values
export const DEFAULT_STARTING_POINTS = 25000;
export const DEFAULT_RETURN_POINTS = 30000;
export const DEFAULT_UMA = {
  first: 30,
  second: 10,
  third: -10,
  fourth: -30,
} as const;
export const DEFAULT_RATE_VALUE = 100; // 1pt = 100 yen (ten-pin)
export const DEFAULT_CHIP_VALUE = 100;
export const TOTAL_POINTS = 100000; // 4 players * 25000

// Rating defaults (Glicko-2)
export const INITIAL_RATING = 1500;
export const INITIAL_RD = 350;
export const INITIAL_VOLATILITY = 0.06;
export const SYSTEM_TAU = 0.5;
export const RD_UPPER_LIMIT = 350;
export const RD_LOWER_LIMIT = 50;

// Rating rank labels
export const RATING_RANKS = [
  { min: 1800, label: '雀聖' },
  { min: 1700, label: '雀豪' },
  { min: 1600, label: '雀傑' },
  { min: 1500, label: '雀士' },
  { min: 1400, label: '初段' },
  { min: 1300, label: '1級' },
  { min: 1200, label: '2級' },
  { min: -Infinity, label: '3級' },
] as const;

// UI constants
export const MIN_TAP_TARGET = 44; // px

// Avatar emoji options
export const AVATAR_EMOJIS = [
  '🀄', '🎴', '🐉', '🐲', '🏯', '🎋', '🌸', '🍃',
  '⭐', '🌙', '🔥', '💎', '🎯', '🎲', '👑', '🦊',
  '🐼', '🐯', '🐺', '🦅', '🌊', '⚡', '🍀', '🎭',
] as const;
