import type { ScoreInput } from '@/types';

interface RuleConfig {
  startingPoints: number;
  returnPoints: number;
  umaFirst: number;
  umaSecond: number;
  umaThird: number;
  umaFourth: number;
}

interface CalculatedScore {
  memberId: string;
  rawScore: number;
  rank: number;
  umaPoint: number;
}

/**
 * Determine ranks from raw scores.
 * Ties are broken by seat order (lower seatOrder = higher rank).
 * seatOrders maps memberId -> seatOrder.
 */
export function determineRanks(
  scores: ScoreInput[],
  seatOrders: Map<string, number>
): { memberId: string; rawScore: number; rank: number }[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    return (seatOrders.get(a.memberId) ?? 0) - (seatOrders.get(b.memberId) ?? 0);
  });

  return sorted.map((s, i) => ({
    memberId: s.memberId,
    rawScore: s.rawScore,
    rank: i + 1,
  }));
}

/**
 * Calculate uma points for each player.
 *
 * point = (raw_score - return_points) / 1000 + uma[rank]
 * oka = (return_points - starting_points) * 4 / 1000  (added to 1st place)
 *
 * The sum of all points must be 0.
 */
export function calculatePoints(
  scores: ScoreInput[],
  seatOrders: Map<string, number>,
  rules: RuleConfig
): CalculatedScore[] {
  const ranked = determineRanks(scores, seatOrders);
  const uma = [rules.umaFirst, rules.umaSecond, rules.umaThird, rules.umaFourth];
  const oka = ((rules.returnPoints - rules.startingPoints) * 4) / 1000;

  const results: CalculatedScore[] = ranked.map((r) => {
    let point = (r.rawScore - rules.returnPoints) / 1000 + uma[r.rank - 1];
    if (r.rank === 1) {
      point += oka;
    }
    // Round to 1 decimal place
    point = Math.round(point * 10) / 10;

    return {
      memberId: r.memberId,
      rawScore: r.rawScore,
      rank: r.rank,
      umaPoint: point,
    };
  });

  return results;
}

/**
 * Validate that raw scores sum to expected total (starting_points * 4).
 */
export function validateScoreTotal(
  scores: ScoreInput[],
  startingPoints: number
): { valid: boolean; total: number; expected: number } {
  const total = scores.reduce((sum, s) => sum + s.rawScore, 0);
  const expected = startingPoints * 4;
  return { valid: total === expected, total, expected };
}

/**
 * Check if any player has busted (score <= 0).
 */
export function checkTobi(scores: ScoreInput[]): string[] {
  return scores.filter((s) => s.rawScore <= 0).map((s) => s.memberId);
}
