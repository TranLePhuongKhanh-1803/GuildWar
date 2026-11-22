import React, { useState, useMemo } from 'react';
import { History, Calendar, Trophy, Eye, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { computeLeaderboard, formatDateTime, formatNumber } from '../utils/ranking';
import { RankMedal } from './PokemonDecor';
import ProofLightbox from './ProofLightbox';
import RewardAnnouncement from './RewardAnnouncement';

function ArchivedWeekCard({ week }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, title: '', items: [] });

  const leaderboard = useMemo(() => computeLeaderboard(week.submissions), [week.submissions]);
  const totalScore = useMemo(
    () => leaderboard.reduce((sum, p) => sum + p.totalScore, 0),
    [leaderboard]
  );

  return (
    <div className="rounded-2xl bg-[#111733]/95 border border-indigo-500/30 overflow-hidden transition">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex flex-wrap items-center justify-between gap-4 p-5 text-left hover:bg-slate-800/35 transition"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
              Tuần {week.weekNumber}
            </span>
            <h3 className="font-display font-bold text-lg text-white">{week.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              {formatDateTime(week.startTime)} → {formatDateTime(week.endTime)}
            </span>
            {week.endedAt && <span>Đã kết thúc: {formatDateTime(week.endedAt)}</span>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Tổng điểm / Top 1</div>
            <div className="font-display font-bold text-amber-300 text-sm sm:text-base">
              {formatNumber(totalScore)} điểm
              {leaderboard[0] ? ` • 👑 ${leaderboard[0].playerName}` : ''}
            </div>
          </div>
          {week.rewards?.confirmed && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <Gift className="w-3.5 h-3.5" />
              Đã phát 40 quà
            </span>
          )}
          <span className="p-2 rounded-xl bg-slate-800 text-slate-300">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-800 space-y-5">
          <RewardAnnouncement rewards={week.rewards} weekTitle={week.title} />

          <div>
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-sky-300 mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Bảng Xếp Hạng Chung Cuộc ({leaderboard.length} thành viên)
            </h4>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-slate-400">Không có điểm nào được duyệt trong tuần này.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-4">Hạng</th>
                      <th className="py-2.5 px-4">Người chơi</th>
                      <th className="py-2.5 px-4 text-right">Tổng điểm</th>
                      <th className="py-2.5 px-4 text-right">Minh chứng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {leaderboard.map((entry) => (
                      <tr key={entry.key} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4">
                          <RankMedal rank={entry.rank} />
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-white">{entry.playerName}</td>
                        <td className="py-2.5 px-4 text-right font-display font-bold text-amber-300">
                          {formatNumber(entry.totalScore)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setLightbox({
                                open: true,
                                title: `${week.title} – Minh chứng của ${entry.playerName}`,
                                items: entry.submissions,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem ({entry.submissionCount})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <ProofLightbox
        isOpen={lightbox.open}
        onClose={() => setLightbox({ open: false, title: '', items: [] })}
        title={lightbox.title}
        items={lightbox.items}
      />
    </div>
  );
}

export default function HistoryView({ history = [] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#111733]/95 border border-purple-500/30 shadow-glow-purple p-5 sm:p-6 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/35">
          <History className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
            Lịch Sử Các Tuần Guild Chiến
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Lưu trữ bảng xếp hạng, ảnh minh chứng và kết quả trao 40 phần quà của các tuần đã kết thúc
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl bg-[#111733]/80 border border-slate-800 p-12 text-center space-y-2">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-medium">Chưa có tuần nào được lưu trong lịch sử</p>
          <p className="text-xs text-slate-500">
            Khi Admin nhấn &quot;Kết thúc tuần &amp; Tạo tuần mới&quot;, dữ liệu tuần cũ sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((week) => (
            <ArchivedWeekCard key={week.id} week={week} />
          ))}
        </div>
      )}
    </div>
  );
}
