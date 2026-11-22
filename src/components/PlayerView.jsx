import React, { useState, useMemo, useRef } from 'react';
import {
  Trophy,
  Upload,
  Send,
  Lock,
  Calendar,
  Users,
  Sparkles,
  Eye,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Clock,
  Flame,
} from 'lucide-react';
import { computeLeaderboard, formatDateTime, formatNumber, getUniqueParticipants } from '../utils/ranking';
import { compressImageToDataUrl } from '../utils/imageUtils';
import { EventStatusBadge, RankMedal, SubmissionStatusBadge } from './PokemonDecor';
import ProofLightbox from './ProofLightbox';
import RewardAnnouncement from './RewardAnnouncement';

export default function PlayerView({ currentWeek, onAddSubmission }) {
  const [playerName, setPlayerName] = useState('');
  const [score, setScore] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [fileName, setFileName] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: string }
  const [lightbox, setLightbox] = useState({ open: false, title: '', items: [] });
  const fileInputRef = useRef(null);

  const submissions = currentWeek?.submissions || [];

  const leaderboard = useMemo(
    () => computeLeaderboard(submissions),
    [submissions]
  );

  const existingPlayers = useMemo(
    () => getUniqueParticipants(submissions),
    [submissions]
  );

  const totalApprovedScore = useMemo(
    () => leaderboard.reduce((sum, p) => sum + p.totalScore, 0),
    [leaderboard]
  );

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === 'pending').length,
    [submissions]
  );

  if (!currentWeek) {
    return (
      <div className="rounded-2xl bg-[#111733]/95 border border-sky-500/30 p-10 text-center space-y-3">
        <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="font-display font-bold text-xl text-white">
          Chưa có sự kiện tuần nào được khởi tạo
        </h2>
        <p className="text-sm text-slate-400">
          Admin cần đăng nhập và tạo Tuần 1 trước khi người chơi có thể nộp điểm.
        </p>
      </div>
    );
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    setIsCompressing(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setProofImage(compressed);
      setFileName(file.name);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Lỗi tải ảnh minh chứng.' });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearImage = () => {
    setProofImage('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isCompressing) return;
    setFeedback(null);

    if (!currentWeek.isOpen) {
      setFeedback({ type: 'error', text: 'Sự kiện hiện đang đóng. Không thể gửi điểm!' });
      return;
    }

    const trimmedName = playerName.trim();
    const numericScore = Number(score);

    if (!trimmedName) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập tên người chơi.' });
      return;
    }
    if (!Number.isFinite(numericScore) || numericScore <= 0) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập số điểm hợp lệ (lớn hơn 0).' });
      return;
    }
    if (!proofImage) {
      setFeedback({ type: 'error', text: 'Vui lòng tải lên hình ảnh minh chứng.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onAddSubmission({
        playerName: trimmedName,
        score: Math.round(numericScore),
        proofImage,
      });

      if (result?.ok) {
        setPlayerName('');
        setScore('');
        handleClearImage();
        setFeedback({
          type: 'success',
          text: 'Đã gửi điểm thành công! Lượt nộp đang chờ Admin duyệt để cộng vào bảng xếp hạng.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: result?.error || 'Không thể lưu lượt gửi điểm.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Có lỗi xảy ra khi gửi điểm.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPlayerProofs = (entry) => {
    setLightbox({
      open: true,
      title: `Minh chứng của ${entry.playerName} (${formatNumber(entry.totalScore)} điểm)`,
      items: entry.submissions,
    });
  };

  const openSingleProof = (sub) => {
    setLightbox({
      open: true,
      title: `Ảnh minh chứng – ${sub.playerName}`,
      items: [sub],
    });
  };

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#131d47] via-[#1a184a] to-[#12244d] border border-sky-400/30 shadow-glow-blue p-5 sm:p-7">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-sky-400/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-20 w-64 h-44 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/35">
                <Flame className="w-3.5 h-3.5" />
                Tuần {currentWeek.weekNumber}
              </span>
              <EventStatusBadge isOpen={currentWeek.isOpen} size="lg" />
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-wide">
              {currentWeek.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                Bắt đầu: <strong className="text-white">{formatDateTime(currentWeek.startTime)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-400" />
                Kết thúc: <strong className="text-white">{formatDateTime(currentWeek.endTime)}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="rounded-xl bg-slate-900/70 border border-sky-400/25 px-4 py-3 text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Thành viên</div>
              <div className="font-display font-bold text-xl text-sky-300 mt-0.5">
                {leaderboard.length}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-amber-400/25 px-4 py-3 text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Tổng điểm</div>
              <div className="font-display font-bold text-xl text-amber-300 mt-0.5">
                {formatNumber(totalApprovedScore)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/70 border border-purple-400/25 px-4 py-3 text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Chờ duyệt</div>
              <div className="font-display font-bold text-xl text-purple-300 mt-0.5">
                {pendingCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmed Rewards Announcement */}
      <RewardAnnouncement rewards={currentWeek.rewards} weekTitle={currentWeek.title} />

      {/* Main Grid: Submit Form + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Submit Score Form */}
        <div className="lg:col-span-4 rounded-2xl bg-[#111733]/95 border border-purple-500/30 shadow-glow-purple p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">Gửi Điểm Guild Chiến</h2>
                <p className="text-xs text-slate-400">Nộp ảnh minh chứng để Admin duyệt</p>
              </div>
            </div>
          </div>

          {!currentWeek.isOpen ? (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-5 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-rose-200">Sự Kiện Đang Đóng</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Admin hiện đang đóng cổng nhận điểm tuần này. Vui lòng quay lại khi sự kiện được mở!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Tên người chơi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  list="guild-players-list"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="VD: AshKetchum, PikachuVN..."
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
                />
                <datalist id="guild-players-list">
                  {existingPlayers.map((p) => (
                    <option key={p.key} value={p.playerName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Số điểm đạt được <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="VD: 1500"
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition font-display"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Ảnh minh chứng <span className="text-rose-400">*</span>
                </label>

                {!proofImage ? (
                  <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700 hover:border-sky-400/70 bg-slate-900/60 hover:bg-slate-900/90 p-5 cursor-pointer transition text-center">
                    <Upload className="w-7 h-7 text-sky-400" />
                    <span className="text-sm font-medium text-slate-200">
                      {isCompressing ? 'Đang xử lý ảnh...' : 'Chọn ảnh chụp màn hình minh chứng'}
                    </span>
                    <span className="text-xs text-slate-400">PNG, JPG, WEBP (tự động tối ưu dung lượng)</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-sky-400/40 bg-slate-950">
                    <img
                      src={proofImage}
                      alt="Xem trước minh chứng"
                      className="w-full max-h-52 object-contain bg-black/40"
                    />
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/95 border-t border-slate-800">
                      <span className="text-xs text-slate-300 truncate">{fileName || 'Ảnh đã tải lên'}</span>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {feedback && (
                <div
                  className={`flex items-start gap-2.5 rounded-xl p-3 text-xs sm:text-sm border ${
                    feedback.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-500/35 text-rose-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isCompressing || isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:via-indigo-400 hover:to-purple-500 text-white font-display font-bold py-3 px-4 shadow-glow-blue transition disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Đang tải ảnh & gửi điểm...' : 'Gửi Điểm Ngay'}
              </button>
            </form>
          )}
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-8 space-y-5">
          <div className="rounded-2xl bg-[#111733]/95 border border-sky-500/30 shadow-glow-blue p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/35">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-white">
                    Bảng Xếp Hạng Guild Chiến
                  </h2>
                  <p className="text-xs text-slate-400">
                    Chỉ tính các lượt điểm đã được Admin duyệt • Sắp xếp từ cao xuống thấp
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                {leaderboard.length} chiến binh
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-10 text-center space-y-2">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-slate-300 font-medium">Chưa có điểm nào được duyệt trong tuần này</p>
                <p className="text-xs text-slate-500">
                  Hãy nộp điểm và chờ Admin xác nhận để xuất hiện trên bảng xếp hạng!
                </p>
              </div>
            ) : (
              <>
                {/* Top 3 Podium */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {topThree.map((entry) => {
                    const cardStyle =
                      entry.rank === 1
                        ? 'bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-slate-900 border-amber-400/50 shadow-glow-gold'
                        : entry.rank === 2
                          ? 'bg-gradient-to-br from-slate-300/15 via-slate-400/10 to-slate-900 border-slate-300/40'
                          : 'bg-gradient-to-br from-orange-600/20 via-amber-700/10 to-slate-900 border-orange-500/40';

                    return (
                      <div
                        key={entry.key}
                        className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${cardStyle}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <RankMedal rank={entry.rank} />
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Hạng {entry.rank}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-white text-base truncate" title={entry.playerName}>
                            {entry.playerName}
                          </div>
                          <div className="font-display font-bold text-2xl text-amber-300 mt-0.5">
                            {formatNumber(entry.totalScore)}
                            <span className="text-xs font-sans font-normal text-slate-400 ml-1">điểm</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPlayerProofs(entry)}
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-sky-300 border border-sky-400/30 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem minh chứng ({entry.submissionCount})
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Full Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                        <th className="py-3 px-4">Hạng</th>
                        <th className="py-3 px-4">Người chơi</th>
                        <th className="py-3 px-4 text-center">Lượt duyệt</th>
                        <th className="py-3 px-4 text-right">Tổng điểm</th>
                        <th className="py-3 px-4 text-right">Minh chứng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-sm">
                      {leaderboard.map((entry) => (
                        <tr
                          key={entry.key}
                          className="hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4">
                            <RankMedal rank={entry.rank} />
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {entry.playerName}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">
                            {entry.submissionCount}
                          </td>
                          <td className="py-3 px-4 text-right font-display font-bold text-amber-300 text-base">
                            {formatNumber(entry.totalScore)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openPlayerProofs(entry)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30 transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem ảnh
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Recent Submissions Feed */}
          {currentWeek.submissions.length > 0 && (
            <div className="rounded-2xl bg-[#111733]/90 border border-slate-800 p-5">
              <h3 className="font-display font-bold text-base text-white mb-3">
                Lượt Gửi Điểm Tuần Này ({currentWeek.submissions.length})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {currentWeek.submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900/75 border border-slate-800/90 px-3.5 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={sub.proofImage}
                        alt={sub.playerName}
                        onClick={() => openSingleProof(sub)}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-700 cursor-pointer hover:border-sky-400 transition shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{sub.playerName}</div>
                        <div className="text-xs text-slate-400">{formatDateTime(sub.createdAt)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-display font-bold text-amber-300">
                        +{formatNumber(sub.score)}
                      </span>
                      <SubmissionStatusBadge status={sub.status} />
                      <button
                        type="button"
                        onClick={() => openSingleProof(sub)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Xem ảnh minh chứng"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ProofLightbox
        isOpen={lightbox.open}
        onClose={() => setLightbox({ open: false, title: '', items: [] })}
        title={lightbox.title}
        items={lightbox.items}
      />
    </div>
  );
}
