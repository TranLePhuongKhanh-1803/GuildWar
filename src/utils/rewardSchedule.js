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
 * using round-robin slots so every day stays balanced (e.g., 5 gifts/day for 40 gifts).
 */
export function generate8DaySchedule(recipients = [], totalDays = REWARD_DAYS) {
  const days = Array.from({ length: totalDays }, (_, idx) => ({
    day: idx + 1,
    label: `Ngày ${idx + 1}`,
    allocations: [],
    totalGifts: 0,
  }));

  // Build round-robin gift slots so no single player is front-loaded onto one day
  const remaining = recipients.map((r) => ({
    playerName: r.playerName,
    left: Math.max(0, Number(r.gifts) || 0),
  }));

  const slots = [];
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const item of remaining) {
      if (item.left > 0) {
        slots.push(item.playerName);
        item.left -= 1;
        if (item.left > 0) hasMore = true;
      }
    }
  }

  if (slots.length === 0) return days;

  // Assign slots into 8 days evenly (e.g., 40 slots / 8 days = 5 gifts/day)
  const basePerDay = Math.floor(slots.length / totalDays);
  const extraDays = slots.length % totalDays;
  let cursor = 0;

  for (let d = 0; d < totalDays; d++) {
    const dayQuota = basePerDay + (d < extraDays ? 1 : 0);
    const dayCounts = new Map();

    for (let k = 0; k < dayQuota && cursor < slots.length; k++) {
      const name = slots[cursor++];
      dayCounts.set(name, (dayCounts.get(name) || 0) + 1);
    }

    days[d].allocations = Array.from(dayCounts.entries()).map(([playerName, gifts]) => ({
      playerName,
      gifts,
    }));
    days[d].totalGifts = dayQuota;
  }

  return days;
}
