import { REWARD_DAYS, TOTAL_WEEKLY_GIFTS } from '../constants/config';

/**
 * Evenly distribute `totalGifts` (40) across all `players` (ordered by rank).
 * Remainder (`totalGifts % N`) is awarded +1 each to the top-ranked players.
 */
export function distributeGiftsEvenly(players = [], totalGifts = TOTAL_WEEKLY_GIFTS) {
  if (players.length === 0) return [];
  const count = players.length;
  const base = Math.floor(totalGifts / count);
  const remainder = totalGifts % count;

  return players.map((p, idx) => ({
    playerName: p.playerName,
    gifts: base + (idx < remainder ? 1 : 0),
  }));
}

/**
 * Distribute all recipients' gifts across 8 days (Ngày 1 -> Ngày 8)
 * ensuring:
 * 1) Every day has balanced total gifts (5 gifts/day for 40 gifts).
 * 2) Each person receives at most 1 gift per day (unless their total gifts > 8).
 */
export function generate8DaySchedule(recipients = [], totalDays = REWARD_DAYS) {
  const days = Array.from({ length: totalDays }, (_, idx) => ({
    day: idx + 1,
    label: `Ngày ${idx + 1}`,
    allocations: [],
    totalGifts: 0,
  }));

  const daySets = Array.from({ length: totalDays }, () => new Set());
  const dayMaps = Array.from({ length: totalDays }, () => new Map());

  // Place recipients with more gifts first so they spread cleanly across distinct days
  const ordered = [...recipients]
    .map((r, originalIdx) => ({
      playerName: r.playerName,
      gifts: Math.max(0, Number(r.gifts) || 0),
      originalIdx,
    }))
    .filter((r) => r.gifts > 0)
    .sort((a, b) => b.gifts - a.gifts || a.originalIdx - b.originalIdx);

  for (const rec of ordered) {
    const key = rec.playerName.trim().toLowerCase();

    for (let k = 0; k < rec.gifts; k++) {
      // Prefer days that don't already have this player, picking the least-loaded day
      let bestDay = -1;
      for (let d = 0; d < totalDays; d++) {
        if (daySets[d].has(key)) continue;
        if (bestDay === -1 || days[d].totalGifts < days[bestDay].totalGifts) {
          bestDay = d;
        }
      }

      // Fallback only if a single person has > totalDays (e.g. > 8 gifts)
      if (bestDay === -1) {
        bestDay = 0;
        for (let d = 1; d < totalDays; d++) {
          if (days[d].totalGifts < days[bestDay].totalGifts) {
            bestDay = d;
          }
        }
      }

      daySets[bestDay].add(key);
      const prevCount = dayMaps[bestDay].get(rec.playerName) || 0;
      dayMaps[bestDay].set(rec.playerName, prevCount + 1);
      days[bestDay].totalGifts += 1;
    }
  }

  for (let d = 0; d < totalDays; d++) {
    days[d].allocations = Array.from(dayMaps[d].entries()).map(([playerName, gifts]) => ({
      playerName,
      gifts,
    }));
  }

  return days;
}
