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
} from 'lucide-react';
import {
  TOTAL_WEEKLY_GIFTS,
  REQUIRED_RECIPIENTS,
  AUTO_GIFT_PER_PLAYER,
} from '../constants/config';
import { getUniqueParticipants, formatNumber } from '../utils/ranking';
import RewardAnnouncement from './RewardAnnouncement';

export default function AdminRewardsPanel({ currentWeek, onSaveRewards }) {
  const participants = useMemo(
    () => getUniqueParticipants(currentWeek.submissions),
    [currentWeek.submissions]
  );

  const [mode, setMode] = useState(currentWeek.rewards?.mode || 'auto');
  const [recipients, setRecipients] = useState(currentWeek.rewards?.recipients || []);
  const [customName, setCustomName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    setMode(currentWeek.rewards?.mode || 'auto');
    setRecipients(currentWeek.rewards?.recipients || []);
    setShowPreview(false);
  }, [currentWeek.id, currentWeek.rewards]);

  const totalAssigned = useMemo(
    () => recipients.reduce((sum, r) => sum + (Number(r.gifts) || 0), 0),
    [recipients]
  );

  const isCountValid = recipients.length === REQUIRED_RECIPIENTS;
  const isTotalValid = totalAssigned === TOTAL_WEEKLY_GIFTS;
  const canConfirm = isCountValid && isTotalValid && recipients.every((r) => (Number(r.gifts) || 0) >= 0);

  const isSelected = (name) =>
    recipients.some((r) => r.playerName.trim().toLowerCase() === name.trim().toLowerCase());

  const applyAutoDistribution = (list) => {
    return list.map((r) => ({
      ...r,
      gifts: AUTO_GIFT_PER_PLAYER,
    }));
  };

  const handleToggleParticipant = (playerName) => {
    setNotice(null);
    if (isSelected(playerName)) {
      const next = recipients.filter(
        (r) => r.playerName.trim().toLowerCase() !== playerName.trim().toLowerCase()
      );
      setRecipients(mode === 'auto' ? applyAutoDistribution(next) : next);
      return;
    }

    if (recipients.length >= REQUIRED_RECIPIENTS) {
      setNotice({
        type: 'error',
        text: `Chỉ được chọn tối đa ${REQUIRED_RECIPIENTS} người nhận quà. Hãy bỏ chọn 1 người trước.`,
      });
      return;
    }

    const next = [
      ...recipients,
      { playerName, gifts: mode === 'auto' ? AUTO_GIFT_PER_PLAYER : 0 },
    ];
    setRecipients(mode === 'auto' ? applyAutoDistribution(next) : next);
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
    if (recipients.length >= REQUIRED_RECIPIENTS) {
      setNotice({
        type: 'error',
        text: `Đã đủ ${REQUIRED_RECIPIENTS} người nhận quà. Hãy xóa bớt trước khi thêm mới.`,
      });
      return;
    }

    const next = [
      ...recipients,
      { playerName: trimmed, gifts: mode === 'auto' ? AUTO_GIFT_PER_PLAYER : 0 },
    ];
    setRecipients(mode === 'auto' ? applyAutoDistribution(next) : next);
    setCustomName('');
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setNotice(null);
    if (nextMode === 'auto') {
      setRecipients((prev) => applyAutoDistribution(prev));
    }
  };

  const handleGiftChange = (index, value) => {
    const num = Math.max(0, Math.min(TOTAL_WEEKLY_GIFTS, parseInt(value, 10) || 0));
    setRecipients((prev) => prev.map((r, i) => (i === index ? { ...r, gifts: num } : r)));
  };

  const handleStepGift = (index, delta) => {
    setRecipients((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const nextVal = Math.max(0, Math.min(TOTAL_WEEKLY_GIFTS, (Number(r.gifts) || 0) + delta));
        return { ...r, gifts: nextVal };
      })
    );
  };

  const handleRemoveRecipient = (index) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (!canConfirm) {
      setNotice({
        type: 'error',
        text: `Cần chọn đúng ${REQUIRED_RECIPIENTS} người và tổng số quà phải bằng ${TOTAL_WEEKLY_GIFTS}.`,
      });
      return;
    }

    onSaveRewards({
      mode,
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      recipients: recipients.map((r) => ({
        playerName: r.playerName,
        gifts: Number(r.gifts) || 0,
      })),
    });
    setShowPreview(false);
    setNotice({
      type: 'success',
      text: 'Đã xác nhận & công bố danh sách nhận 40 phần quà thành công!',
    });
  };

  const handleUnpublish = () => {
    onSaveRewards({
      mode,
      confirmed: false,
      confirmedAt: null,
      recipients,
    });
    setNotice({
      type: 'success',
      text: 'Đã gỡ công bố để bạn chỉnh sửa lại danh sách nhận quà.',
    });
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Pick 5 recipients */}
        <div className="lg:col-span-5 rounded-2xl bg-[#111733]/95 border border-purple-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Bước 1: Chọn {REQUIRED_RECIPIENTS} Người Nhận Quà
                </h3>
                <p className="text-xs text-slate-400">Không bắt buộc theo thứ hạng BXH</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                isCountValid
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                  : 'bg-amber-500/15 text-amber-300 border-amber-400/40'
              }`}
            >
              {recipients.length} / {REQUIRED_RECIPIENTS}
            </span>
          </div>

          {/* Add custom member */}
          <form onSubmit={handleAddCustomPlayer} className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nhập tên thành viên bất kỳ..."
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

          {/* Participant quick-pick list */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Thành viên đã tham gia tuần này ({participants.length})
            </div>
            {participants.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                Chưa có ai nộp điểm tuần này. Bạn có thể nhập tên thành viên ở ô phía trên.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {participants.map((p) => {
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
                      <span className="font-medium truncate">{p.playerName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-amber-300 font-display">
                          {formatNumber(p.approvedScore)} đ
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
                  Bước 2: Phân Bổ {TOTAL_WEEKLY_GIFTS} Phần Quà
                </h3>
                <p className="text-xs text-slate-400">
                  Chọn chế độ chia tự động (8 quà/người) hoặc chỉnh thủ công
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
                Chia tự động (8×5)
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
              Hãy chọn 5 người nhận quà ở cột bên trái để bắt đầu phân bổ.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recipients.map((rec, idx) => (
                <div
                  key={`${rec.playerName}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900/80 border border-slate-800 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center font-display font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-white truncate">{rec.playerName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {mode === 'auto' ? (
                      <span className="px-3 py-1.5 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 font-display font-bold text-sm">
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
              {showPreview ? 'Ẩn xem trước' : 'Xem trước danh sách'}
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
                Xem trước bảng công bố ({currentWeek.title})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {recipients.map((r, i) => (
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
    </div>
  );
}
