import React from 'react';
import { Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import { TOTAL_WEEKLY_GIFTS } from '../constants/config';
import { formatDateTime } from '../utils/ranking';

export default function RewardAnnouncement({ rewards, weekTitle }) {
  if (!rewards?.confirmed || !rewards?.recipients?.length) return null;

  const totalGifts = rewards.recipients.reduce((acc, r) => acc + (Number(r.gifts) || 0), 0);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#191b42] via-[#1b143b] to-[#121c3d] border border-amber-400/40 shadow-glow-gold p-5 sm:p-6">
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-purple-500/15 blur-2xl pointer-events-none" />

      <div className="relative flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-glow-gold">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg sm:text-xl text-amber-300 tracking-wide">
                CÔNG BỐ KẾT QUẢ NHẬN QUÀ
              </h2>
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              {weekTitle} • Tổng cộng {totalGifts}/{TOTAL_WEEKLY_GIFTS} phần quà cho {rewards.recipients.length} thành viên
            </p>
          </div>
        </div>

        {rewards.confirmedAt && (
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã xác nhận: {formatDateTime(rewards.confirmedAt)}
          </span>
        )}
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {rewards.recipients.map((rec, idx) => (
          <div
            key={`${rec.playerName}-${idx}`}
            className="rounded-xl bg-slate-900/75 border border-amber-400/25 hover:border-amber-400/55 p-4 flex flex-col justify-between transition"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                Người nhận #{idx + 1}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 font-display font-bold text-sm border border-amber-400/30">
                <Gift className="w-3.5 h-3.5" />
                {rec.gifts} quà
              </span>
            </div>
            <div className="font-semibold text-white text-base truncate" title={rec.playerName}>
              {rec.playerName}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
