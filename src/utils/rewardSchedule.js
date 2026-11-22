import { REWARD_DAYS } from '../constants/config';

/**
 * Automatically distribute each recipient's gift count across all 8 days (Ngày 1 -> Ngày 8).
 * For standard 8 gifts/person (5 people = 40 gifts), every day gets 1 gift per person (5 gifts/day).
 * For custom manual counts, distributes evenly with a staggered offset to keep daily totals balanced.
 */
export function generate8DaySchedule(recipients = [], totalDays = REWARD_DAYS) {
  const days = Array.from({ length: totalDays }, (_, idx) => ({
    day: idx + 1,
    label: `Ngày ${idx + 1}`,
    allocations: [],
    totalGifts: 0,
  }));

  recipients.forEach((rec, recIdx) => {
    const totalForPlayer = Math.max(0, Number(rec.gifts) || 0);
    if (totalForPlayer === 0) return;

    const basePerDay = Math.floor(totalForPlayer / totalDays);
    const remainder = totalForPlayer % totalDays;
    const startOffset = (recIdx * 3) % totalDays;

    for (let d = 0; d < totalDays; d++) {
      const shiftedIndex = (d - startOffset + totalDays) % totalDays;
      const countForDay = basePerDay + (shiftedIndex < remainder ? 1 : 0);
      if (countForDay > 0) {
        days[d].allocations.push({
          playerName: rec.playerName,
          gifts: countForDay,
        });
        days[d].totalGifts += countForDay;
      }
    }
  });

  return days;
}
