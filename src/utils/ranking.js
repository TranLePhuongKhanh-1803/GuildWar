import { SUBMISSION_STATUS } from '../constants/config';

/**
 * Compute ranked leaderboard from approved submissions only.
 */
export function computeLeaderboard(submissions = []) {
  const playerMap = new Map();

  for (const sub of submissions) {
    if (sub.status !== SUBMISSION_STATUS.APPROVED) continue;
    const rawName = (sub.playerName || '').trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    const numericScore = Number(sub.score) || 0;

    if (!playerMap.has(key)) {
      playerMap.set(key, {
        key,
        playerName: rawName,
        totalScore: 0,
        submissionCount: 0,
        submissions: [],
        lastSubmittedAt: sub.createdAt,
      });
    }

    const entry = playerMap.get(key);
    entry.playerName = rawName;
    entry.totalScore += numericScore;
    entry.submissionCount += 1;
    entry.submissions.push(sub);
    if (sub.createdAt > entry.lastSubmittedAt) {
      entry.lastSubmittedAt = sub.createdAt;
    }
  }

  const list = Array.from(playerMap.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.lastSubmittedAt.localeCompare(b.lastSubmittedAt);
  });

  return list.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

/**
 * Get all unique participant names (from any submission status) for reward selection.
 */
export function getUniqueParticipants(submissions = []) {
  const map = new Map();
  for (const sub of submissions) {
    const rawName = (sub.playerName || '').trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { key, playerName: rawName, approvedScore: 0, totalSubmissions: 0 });
    }
    const item = map.get(key);
    item.playerName = rawName;
    item.totalSubmissions += 1;
    if (sub.status === SUBMISSION_STATUS.APPROVED) {
      item.approvedScore += Number(sub.score) || 0;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.approvedScore - a.approvedScore);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

export function formatDateTime(value) {
  if (!value) return 'Chưa thiết lập';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toLocalDateTimeInput(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
