import { STORAGE_KEY } from '../constants/config';
import { toLocalDateTimeInput } from './ranking';

export function createNewWeek(weekNumber = 1, title = '') {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: `week-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    weekNumber,
    title: title || `Tuần ${weekNumber} – Đại Chiến Guild`,
    startTime: toLocalDateTimeInput(now),
    endTime: toLocalDateTimeInput(end),
    isOpen: true,
    submissions: [],
    rewards: {
      mode: 'auto', // 'auto' | 'manual'
      confirmed: false,
      confirmedAt: null,
      recipients: [], // [{ playerName, gifts }]
    },
    createdAt: new Date().toISOString(),
    endedAt: null,
  };
}

export function createInitialState() {
  return {
    currentWeek: createNewWeek(1),
    history: [],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.currentWeek) return createInitialState();
    return {
      currentWeek: parsed.currentWeek,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err?.name === 'QuotaExceededError'
          ? 'Bộ nhớ trình duyệt (LocalStorage) đã đầy! Hãy xóa bớt ảnh minh chứng cũ hoặc kết thúc/reset tuần.'
          : 'Không thể lưu dữ liệu vào LocalStorage.',
    };
  }
}

export function resetAllStorage() {
  localStorage.removeItem(STORAGE_KEY);
  return createInitialState();
}
