import React, { useState, useMemo, useEffect } from 'react';
import {
  Gift,
  Users,
  Plus,
  Minus,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  UserPlus,
  RotateCcw,
  CalendarDays,
  Wand2,
} from 'lucide-react';
import { TOTAL_WEEKLY_GIFTS, REWARD_DAYS } from '../constants/config';
import { computeLeaderboard, formatNumber } from '../utils/ranking';
import { distributeGiftsEvenly, generate8DaySchedule } from '../utils/rewardSchedule';
import RewardAnnouncement from './RewardAnnouncement';

function normalizeScheduleDays(days = [], totalDays = REWARD_DAYS) {
  return Array.from({ length: totalDays }, (_, idx) => {
    const existing = days.find((d) => d.day === idx + 1);
    const allocations = (existing?.allocations || [])
      .map((a) => ({
        playerName: a.playerName,
        gifts: Math.max(0, Number(a.gifts) || 0),
      }))
      .filter((a) => a.gifts > 0);
    const totalGifts = allocations.reduce((s, a) => s + a.gifts, 0);
    return {
      day: idx + 1,
      label: `Ngày ${idx + 1}`,
      allocations,
      totalGifts,
    };
  });
}

function summarizeRecipientsFromSchedule(schedule, baseRecipients = []) {
  const totalsMap = new Map();
  for (const r of baseRecipients) {
    totalsMap.set(r.playerName.trim().toLowerCase(), {
      playerName: r.playerName,
      gifts: 0,
    });
  }
  for (const day of schedule) {
    for (const alloc of day.allocations) {
      const key = alloc.playerName.trim().toLowerCase();
      const prev = totalsMap.get(key) || { playerName: alloc.playerName, gifts: 0 };
      prev.gifts += Number(alloc.gifts) || 0;
      totalsMap.set(key, prev);
    }
  }
  return Array.from(totalsMap.values());
}

export default function AdminRewardsPanel({ currentWeek, onSaveRewards }) {
  // Chỉ lấy những người tham gia đã được duyệt điểm (BXH hợp lệ)
  const approvedPlayers = useMemo(
    () => computeLeaderboard(currentWeek.submissions),
    [currentWeek.submissions]
  );

  const [mode, setMode] = useState(currentWeek.rewards?.mode || 'auto');
  const [recipients, setRecipients] = useState(currentWeek.rewards?.recipients || []);
  const [dailySchedule, setDailySchedule] = useState(() => {
    if (currentWeek.rewards?.dailySchedule?.length) {
      return normalizeScheduleDays(currentWeek.rewards.dailySchedule);
    }
    return generate8DaySchedule(currentWeek.rewards?.recipients || [], REWARD_DAYS);
  });
  const [customName, setCustomName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const initMode = currentWeek.rewards?.mode || 'auto';
    const initRecipients = currentWeek.rewards?.recipients || [];
    const initSchedule = currentWeek.rewards?.dailySchedule?.length
      ? normalizeScheduleDays(currentWeek.rewards.dailySchedule)
      : generate8DaySchedule(initRecipients, REWARD_DAYS);

    setMode(initMode);
    setRecipients(initRecipients);
    setDailySchedule(initSchedule);
    setShowPreview(false);
  }, [currentWeek.id, currentWeek.rewards]);

  const totalAssigned = useMemo(
    () => recipients.reduce((sum, r) => sum + (Number(r.gifts) || 0), 0),
    [recipients]
  );

  const isCountValid = recipients.some((r) => (Number(r.gifts) || 0) > 0);
  const isTotalValid = totalAssigned === TOTAL_WEEKLY_GIFTS;
  const canConfirm =
    isCountValid && isTotalValid && recipients.every((r) => (Number(r.gifts) || 0) >= 0);

  const isSelected = (name) =>
    recipients.some((r) => r.playerName.trim().toLowerCase() === name.trim().toLowerCase());

  const syncRecipientsAndSchedule = (nextRecipients) => {
    setRecipients(nextRecipients);
    setDailySchedule(generate8DaySchedule(nextRecipients, REWARD_DAYS));
  };

  const handleAutoArrangeAll8Days = () => {
    setNotice(null);
    if (approvedPlayers.length === 0) {
      setNotice({
        type: 'error',
        text: 'Chưa có thành viên nào được duyệt điểm trong tuần này để sắp quà tự động.',
      });
      return;
    }

    const distributed = distributeGiftsEvenly(approvedPlayers, TOTAL_WEEKLY_GIFTS);
    setMode('auto');
    syncRecipientsAndSchedule(distributed);
    setShowPreview(true);

    const base = Math.floor(TOTAL_WEEKLY_GIFTS / approvedPlayers.length);
    const rem = TOTAL_WEEKLY_GIFTS % approvedPlayers.length;
    setNotice({
      type: 'success',
      text:
        rem === 0
          ? `Đã chia đều ${TOTAL_WEEKLY_GIFTS} phần quà cho ${approvedPlayers.length} thành viên đã duyệt điểm (${base} quà/người). Bạn có thể chỉnh trực tiếp từng người từng ngày bên dưới!`
          : `Đã chia ${TOTAL_WEEKLY_GIFTS} phần quà cho ${approvedPlayers.length} thành viên đã duyệt điểm (Top ${rem} nhận ${base + 1} quà, còn lại ${base} quà). Bạn có thể chỉnh trực tiếp từng người từng ngày bên dưới!`,
    });
  };

  const handleToggleParticipant = (playerName) => {
    setNotice(null);
    let next;
    if (isSelected(playerName)) {
      next = recipients.filter(
        (r) => r.playerName.trim().toLowerCase() !== playerName.trim().toLowerCase()
      );
    } else {
      next = [...recipients, { playerName, gifts: 0 }];
    }
    const updated = mode === 'auto' ? distributeGiftsEvenly(next, TOTAL_WEEKLY_GIFTS) : next;
    syncRecipientsAndSchedule(updated);
  };

  const handleAddCustomPlayer = (e) => {
    e.preventDefault();
    setNotice(null);
    const trimmed = customName.trim();
    if (!trimmed) return;

    if (isSelected(trimmed)) {
      setNotice({ type: 'error', text: `"${trimmed}" đã có trong danh sách nhận quà.` });
      return;
    }

    const next = [...recipients, { playerName: trimmed, gifts: 0 }];
    const updated = mode === 'auto' ? distributeGiftsEvenly(next, TOTAL_WEEKLY_GIFTS) : next;
    syncRecipientsAndSchedule(updated);
    setCustomName('');
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setNotice(null);
    if (nextMode === 'auto') {
      syncRecipientsAndSchedule(distributeGiftsEvenly(recipients, TOTAL_WEEKLY_GIFTS));
    }
  };

  const handleGiftChange = (index, value) => {
    const num = Math.max(0, Math.min(TOTAL_WEEKLY_GIFTS, parseInt(value, 10) || 0));
    const next = recipients.map((r, i) => (i === index ? { ...r, gifts: num } : r));
    setMode('manual');
    syncRecipientsAndSchedule(next);
  };

  const handleStepGift = (index, delta) => {
    const next = recipients.map((r, i) => {
      if (i !== index) return r;
      const nextVal = Math.max(0, Math.min(TOTAL_WEEKLY_GIFTS, (Number(r.gifts) || 0) + delta));
      return { ...r, gifts: nextVal };
    });
    setMode('manual');
    syncRecipientsAndSchedule(next);
  };

  const handleRemoveRecipient = (index) => {
    const next = recipients.filter((_, i) => i !== index);
    const updated = mode === 'auto' ? distributeGiftsEvenly(next, TOTAL_WEEKLY_GIFTS) : next;
    syncRecipientsAndSchedule(updated);
  };

  // Chỉnh sửa trực tiếp số quà từng người từng ngày (cho phép đặc cách)
  const handleDayAllocationChange = (dayNum, playerName, nextGiftValue) => {
    setNotice(null);
    const clamped = Math.max(0, Math.min(TOTAL_WEEKLY_GIFTS, parseInt(nextGiftValue, 10) || 0));
    const nextSchedule = dailySchedule.map((d) => {
      if (d.day !== dayNum) return d;
      const existingIdx = d.allocations.findIndex(
        (a) => a.playerName.trim().toLowerCase() === playerName.trim().toLowerCase()
      );
      let nextAllocs = [...d.allocations];
      if (existingIdx >= 0) {
        if (clamped === 0) {
          nextAllocs.splice(existingIdx, 1);
        } else {
          nextAllocs[existingIdx] = { ...nextAllocs[existingIdx], gifts: clamped };
        }
      } else if (clamped > 0) {
        nextAllocs.push({ playerName, gifts: clamped });
      }
      const totalGifts = nextAllocs.reduce((sum, a) => sum + a.gifts, 0);
      return { ...d, allocations: nextAllocs, totalGifts };
    });

    setMode('manual');
    setDailySchedule(nextSchedule);
    setRecipients((prev) => summarizeRecipientsFromSchedule(nextSchedule, prev));
  };

  const handleAddSpecialToDay = (dayNum, playerName) => {
    if (!playerName) return;
    const dayObj = dailySchedule.find((d) => d.day === dayNum);
    const currentVal =
      dayObj?.allocations.find(
        (a) => a.playerName.trim().toLowerCase() === playerName.trim().toLowerCase()
      )?.gifts || 0;
    handleDayAllocationChange(dayNum, playerName, currentVal + 1);
  };

  const handleConfirm = () => {
    if (!canConfirm) {
      setNotice({
        type: 'error',
        text: `Tổng số quà phân bổ qua 8 ngày phải đúng ${TOTAL_WEEKLY_GIFTS} (hiện tại: ${totalAssigned}).`,
      });
      return;
    }

    const cleanRecipients = recipients
      .map((r) => ({
        playerName: r.playerName,
        gifts: Number(r.gifts) || 0,
      }))
      .filter((r) => r.gifts > 0);

    const cleanSchedule = normalizeScheduleDays(dailySchedule, REWARD_DAYS);

    onSaveRewards({
      mode,
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      recipients: cleanRecipients,
      dailySchedule: cleanSchedule,
    });
    setShowPreview(false);
    setNotice({
      type: 'success',
      text: `Đã xác nhận & công bố danh sách nhận ${TOTAL_WEEKLY_GIFTS} phần quà cho ${cleanRecipients.length} thành viên (${REWARD_DAYS} ngày)!`,
    });
  };

  const handleUnpublish = () => {
    onSaveRewards({
      mode,
      confirmed: false,
      confirmedAt: null,
      recipients,
      dailySchedule,
    });
    setNotice({
      type: 'success',
      text: 'Đã gỡ công bố để bạn chỉnh sửa lại danh sách nhận quà.',
    });
  };

  // Danh sách ứng viên có thể thêm đặc cách vào từng ngày
  const candidateNames = useMemo(() => {
    const map = new Map();
    for (const p of approvedPlayers) {
      map.set(p.playerName.trim().toLowerCase(), p.playerName);
    }
    for (const r of recipients) {
      map.set(r.playerName.trim().toLowerCase(), r.playerName);
    }
    return Array.from(map.values());
  }, [approvedPlayers, recipients]);

  return (
    <div className="space-y-6">
      {/* Published view if already confirmed */}
      {currentWeek.rewards?.confirmed && (
        <div className="space-y-3">
          <RewardAnnouncement rewards={currentWeek.rewards} weekTitle={currentWeek.title} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleUnpublish}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Mở khóa để chỉnh sửa lại quà
            </button>
          </div>
        </div>
      )}

      {/* Quick Auto-Arrange 8 Days Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950/90 via-purple-950/80 to-slate-900/90 border border-sky-400/35 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-300 font-display font-bold text-base">
            <CalendarDays className="w-5 h-5" />
            Sắp Quà Tự Động Tất Cả {REWARD_DAYS} Ngày
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Chia đều {TOTAL_WEEKLY_GIFTS} phần quà cho{' '}
            <strong className="text-amber-300">{approvedPlayers.length} thành viên đã được duyệt điểm</strong>{' '}
            qua <strong>Ngày 1 → Ngày {REWARD_DAYS}</strong>, sau đó có thể chỉnh sửa trực tiếp từng người từng ngày (đặc cách thêm quà).
          </p>
        </div>

        <button
          type="button"
          onClick={handleAutoArrangeAll8Days}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-display font-bold text-xs sm:text-sm shadow-glow-blue transition shrink-0"
        >
          <Wand2 className="w-4 h-4" />
          Sắp quà tự động 8 ngày ({approvedPlayers.length} người)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Pick recipients */}
        <div className="lg:col-span-5 rounded-2xl bg-[#111733]/95 border border-purple-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Bước 1: Chọn Người Nhận Quà
                </h3>
                <p className="text-xs text-slate-400">
                  Mặc định lấy tất cả người đã duyệt điểm, hoặc chọn/thêm tùy ý
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                recipients.length > 0
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                  : 'bg-amber-500/15 text-amber-300 border-amber-400/40'
              }`}
            >
              {recipients.length} người
            </span>
          </div>

          {/* Add custom member */}
          <form onSubmit={handleAddCustomPlayer} className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nhập tên thành viên đặc cách..."
              className="flex-1 rounded-xl bg-slate-900 border border-slate-700 focus:border-sky-400 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/35 text-xs font-semibold transition"
            >
              <UserPlus className="w-4 h-4" />
              Thêm
            </button>
          </form>

          {/* Approved participants list */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Thành viên đã được duyệt điểm ({approvedPlayers.length})
            </div>
            {approvedPlayers.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                Chưa có thành viên nào được duyệt điểm tuần này. Hãy duyệt điểm trước hoặc nhập tên ở ô trên.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {approvedPlayers.map((p) => {
                  const active = isSelected(p.playerName);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleToggleParticipant(p.playerName)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition ${
                        active
                          ? 'bg-purple-500/20 border-purple-400/60 text-white'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <span className="font-medium truncate">
                        #{p.rank} {p.playerName}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-amber-300 font-display">
                          {formatNumber(p.totalScore)} đ
                        </span>
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                            active
                              ? 'bg-purple-500 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {active ? '✓' : '+'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Distribute 40 gifts */}
        <div className="lg:col-span-7 rounded-2xl bg-[#111733]/95 border border-amber-500/30 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/35">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Bước 2: Tổng Hợp Quà Theo Từng Người ({TOTAL_WEEKLY_GIFTS} Quà)
                </h3>
                <p className="text-xs text-slate-400">
                  Tự động đồng bộ với bảng chỉnh sửa chi tiết 8 ngày bên dưới
                </p>
              </div>
            </div>

            {/* Mode Switch */}
            <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => handleModeChange('auto')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  mode === 'auto'
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Chia tự động ({TOTAL_WEEKLY_GIFTS} quà)
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  mode === 'manual'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Thủ công
              </button>
            </div>
          </div>

          {/* Progress Bar for 40 gifts */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Tổng số quà đã phân bổ</span>
              <span
                className={`font-display font-bold text-sm ${
                  isTotalValid
                    ? 'text-emerald-300'
                    : totalAssigned > TOTAL_WEEKLY_GIFTS
                      ? 'text-rose-300'
                      : 'text-amber-300'
                }`}
              >
                {totalAssigned} / {TOTAL_WEEKLY_GIFTS} phần quà
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isTotalValid
                    ? 'bg-emerald-400'
                    : totalAssigned > TOTAL_WEEKLY_GIFTS
                      ? 'bg-rose-500'
                      : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, (totalAssigned / TOTAL_WEEKLY_GIFTS) * 100)}%` }}
              />
            </div>
            {!isTotalValid && (
              <p className="text-xs text-amber-300/90 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {totalAssigned < TOTAL_WEEKLY_GIFTS
                  ? `Còn thiếu ${TOTAL_WEEKLY_GIFTS - totalAssigned} phần quà nữa để đủ 40.`
                  : `Đang vượt quá ${totalAssigned - TOTAL_WEEKLY_GIFTS} phần quà! Tổng phải đúng 40.`}
              </p>
            )}
          </div>

          {/* Selected Recipients List */}
          {recipients.length === 0 ? (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-8 text-center text-sm text-slate-400">
              Hãy bấm <strong className="text-sky-300">Sắp quà tự động 8 ngày</strong> ở trên để chia đều{' '}
              {TOTAL_WEEKLY_GIFTS} quà cho toàn bộ {approvedPlayers.length} thành viên đã duyệt điểm.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {recipients.map((rec, idx) => (
                <div
                  key={`${rec.playerName}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900/80 border border-slate-800 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center font-display font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate">{rec.playerName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {mode === 'auto' ? (
                      <span className="px-3 py-1 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 font-display font-bold text-sm">
                        {rec.gifts} quà
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStepGift(idx, -1)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          aria-label="Giảm"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={TOTAL_WEEKLY_GIFTS}
                          value={rec.gifts}
                          onChange={(e) => handleGiftChange(idx, e.target.value)}
                          className="w-16 text-center rounded-lg bg-slate-950 border border-slate-700 focus:border-amber-400 py-1 text-sm font-display font-bold text-amber-300 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStepGift(idx, 1)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          aria-label="Tăng"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(idx)}
                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition"
                      title="Bỏ chọn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {notice && (
            <div
              className={`rounded-xl p-3 text-xs sm:text-sm flex items-center gap-2 border ${
                notice.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-500/35 text-rose-200'
              }`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{notice.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => setShowPreview((p) => !p)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-400/30 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? 'Ẩn xem trước' : 'Xem trước bảng công bố'}
            </button>

            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display font-bold text-sm shadow-glow-gold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Xác Nhận &amp; Công Bố Quà
            </button>
          </div>

          {/* Preview Box */}
          {showPreview && canConfirm && (
            <div className="rounded-xl bg-slate-950/90 border border-sky-400/40 p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Xem trước bảng công bố ({recipients.filter((r) => r.gifts > 0).length} người nhận • {totalAssigned} quà)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {recipients
                  .filter((r) => r.gifts > 0)
                  .map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-center"
                    >
                      <div className="text-[11px] text-slate-400">#{i + 1}</div>
                      <div className="font-semibold text-white text-sm truncate">{r.playerName}</div>
                      <div className="font-display font-bold text-amber-300 text-sm mt-0.5">
                        {r.gifts} quà
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editable 8-Day Schedule Grid */}
      <section className="rounded-2xl bg-[#111733]/95 border border-sky-500/30 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Bước 3: Chỉnh Sửa Quà Từng Người Từng Ngày (Đặc Cách)
              </h3>
              <p className="text-xs text-slate-400">
                Tăng/giảm trực tiếp số quà của từng người ở mỗi ngày hoặc thêm người đặc cách vào ngày bất kỳ. Tổng cả 8 ngày phải bằng {TOTAL_WEEKLY_GIFTS}.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-display font-bold border ${
              isTotalValid
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                : 'bg-amber-500/15 text-amber-300 border-amber-400/40'
            }`}
          >
            Tổng 8 ngày: {totalAssigned} / {TOTAL_WEEKLY_GIFTS} quà
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dailySchedule.map((dayItem) => {
            const availableToAdd = candidateNames.filter(
              (name) =>
                !dayItem.allocations.some(
                  (a) => a.playerName.trim().toLowerCase() === name.trim().toLowerCase()
                )
            );

            return (
              <div
                key={dayItem.day}
                className="rounded-xl bg-slate-900/85 border border-indigo-500/30 p-3.5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-display font-bold text-sm text-sky-300">
                      {dayItem.label}
                    </span>
                    <span className="text-xs font-display font-bold px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/25">
                      {dayItem.totalGifts} quà
                    </span>
                  </div>

                  {dayItem.allocations.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2 text-center">Chưa có quà ngày này</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayItem.allocations.map((alloc) => (
                        <div
                          key={alloc.playerName}
                          className="flex items-center justify-between gap-2 text-xs bg-slate-950/70 rounded-lg px-2.5 py-1.5 border border-slate-800"
                        >
                          <span className="text-slate-200 font-medium truncate" title={alloc.playerName}>
                            {alloc.playerName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                handleDayAllocationChange(dayItem.day, alloc.playerName, alloc.gifts - 1)
                              }
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                              aria-label="Giảm quà ngày"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={TOTAL_WEEKLY_GIFTS}
                              value={alloc.gifts}
                              onChange={(e) =>
                                handleDayAllocationChange(dayItem.day, alloc.playerName, e.target.value)
                              }
                              className="w-9 text-center rounded bg-slate-900 border border-slate-700 focus:border-amber-400 py-0.5 text-xs font-display font-bold text-amber-300 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleDayAllocationChange(dayItem.day, alloc.playerName, alloc.gifts + 1)
                              }
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                              aria-label="Tăng quà ngày"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {availableToAdd.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => handleAddSpecialToDay(dayItem.day, e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 hover:border-sky-400/60 px-2.5 py-1.5 text-xs text-sky-300 outline-none cursor-pointer"
                  >
                    <option value="">+ Thêm đặc cách vào {dayItem.label}...</option>
                    {availableToAdd.map((name) => (
                      <option key={name} value={name} className="bg-slate-900 text-white">
                        {name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
