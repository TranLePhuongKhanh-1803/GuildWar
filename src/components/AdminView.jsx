import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  LogOut,
  Check,
  X,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  PlusCircle,
  RotateCcw,
  Gift,
  ClipboardList,
  Save,
  Sparkles,
} from 'lucide-react';
import { ADMIN_PASSWORD, SUBMISSION_STATUS } from '../constants/config';
import {
  subscribeAdminAuth,
  signInAdminFirebase,
  signOutAdminFirebase,
} from '../services/firebaseService';
import { formatDateTime, formatNumber } from '../utils/ranking';
import { EventStatusBadge, SubmissionStatusBadge } from './PokemonDecor';
import ProofLightbox from './ProofLightbox';
import AdminRewardsPanel from './AdminRewardsPanel';

const ADMIN_SESSION_KEY = 'guild_war_admin_auth';

export default function AdminView({
  cloudActive,
  currentWeek,
  onCreateInitialWeek,
  onUpdateWeekMeta,
  onToggleOpen,
  onModerateSubmission,
  onEditSubmissionScore,
  onDeleteSubmission,
  onSaveRewards,
  onEndWeekAndCreateNew,
  onResetAll,
  onSeedDemoData,
}) {
  const [localAuthed, setLocalAuthed] = useState(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true'
  );
  const [cloudAdminUser, setCloudAdminUser] = useState(null);
  const [cloudIsAdmin, setCloudIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'rewards'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');

  // Week meta form
  const [weekTitle, setWeekTitle] = useState(currentWeek?.title || '');
  const [startTime, setStartTime] = useState(currentWeek?.startTime || '');
  const [endTime, setEndTime] = useState(currentWeek?.endTime || '');
  const [metaSavedMsg, setMetaSavedMsg] = useState('');

  // Inline score editing
  const [editingId, setEditingId] = useState(null);
  const [editingScore, setEditingScore] = useState('');

  // Lightbox
  const [lightbox, setLightbox] = useState({ open: false, title: '', items: [] });

  // Confirm modals
  const [confirmAction, setConfirmAction] = useState(null); // 'end_week' | 'reset_all' | null

  useEffect(() => {
    if (!cloudActive) return undefined;
    return subscribeAdminAuth(({ user, isAdmin }) => {
      setCloudAdminUser(user);
      setCloudIsAdmin(isAdmin);
    });
  }, [cloudActive]);

  useEffect(() => {
    setWeekTitle(currentWeek?.title || '');
    setStartTime(currentWeek?.startTime || '');
    setEndTime(currentWeek?.endTime || '');
  }, [currentWeek?.id, currentWeek?.title, currentWeek?.startTime, currentWeek?.endTime]);

  const isAuthed = cloudActive ? Boolean(cloudAdminUser && cloudIsAdmin) : localAuthed;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (cloudActive) {
      setIsLoggingIn(true);
      try {
        await signInAdminFirebase(email, password);
        setPassword('');
      } catch (err) {
        setLoginError(err?.message || 'Đăng nhập Firebase thất bại.');
      } finally {
        setIsLoggingIn(false);
      }
      return;
    }

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setLocalAuthed(true);
      setLoginError('');
      setPassword('');
    } else {
      setLoginError('Mật khẩu Admin không chính xác!');
    }
  };

  const handleLogout = async () => {
    if (cloudActive) {
      await signOutAdminFirebase();
      return;
    }
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setLocalAuthed(false);
  };

  const handleSaveMeta = (e) => {
    e.preventDefault();
    if (!currentWeek) return;
    onUpdateWeekMeta({
      title: weekTitle.trim() || `Tuần ${currentWeek.weekNumber} – Đại Chiến Guild`,
      startTime,
      endTime,
    });
    setMetaSavedMsg('Đã lưu thông tin tuần!');
    setTimeout(() => setMetaSavedMsg(''), 2500);
  };

  const counts = useMemo(() => {
    const subs = currentWeek?.submissions || [];
    return {
      all: subs.length,
      pending: subs.filter((s) => s.status === SUBMISSION_STATUS.PENDING).length,
      approved: subs.filter((s) => s.status === SUBMISSION_STATUS.APPROVED).length,
      rejected: subs.filter((s) => s.status === SUBMISSION_STATUS.REJECTED).length,
    };
  }, [currentWeek?.submissions]);

  const filteredSubmissions = useMemo(() => {
    const subs = currentWeek?.submissions || [];
    return subs.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (
        searchQuery.trim() &&
        !sub.playerName.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [currentWeek?.submissions, statusFilter, searchQuery]);

  const startEditScore = (sub) => {
    setEditingId(sub.id);
    setEditingScore(String(sub.score));
  };

  const saveEditScore = (id) => {
    const num = Number(editingScore);
    if (Number.isFinite(num) && num >= 0) {
      onEditSubmissionScore(id, Math.round(num));
    }
    setEditingId(null);
    setEditingScore('');
  };

  if (!isAuthed) {
    return (
      <div className="max-w-md mx-auto mt-8 rounded-2xl bg-[#111733]/95 border border-purple-500/35 shadow-glow-purple p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-glow-purple">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Đăng Nhập Admin</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {cloudActive
              ? 'Đăng nhập bằng tài khoản Firebase Admin đã được cấp quyền trong collection admins'
              : 'Nhập mật khẩu quản trị viên (chế độ LocalStorage dự phòng)'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {cloudActive && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Admin (Firebase Auth)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@guild.com"
                required
                autoFocus
                className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25 px-4 py-2.5 text-sm text-white outline-none transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Mật khẩu Admin
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              required
              autoFocus={!cloudActive}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25 px-4 py-2.5 text-sm text-white outline-none transition"
            />
          </div>

          {loginError && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/35 px-3.5 py-2.5 text-xs text-rose-200 leading-relaxed">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 hover:from-purple-500 hover:to-sky-400 text-white font-display font-bold py-2.5 shadow-glow-purple transition disabled:opacity-60"
          >
            {isLoggingIn ? 'Đang xác thực Firebase...' : 'Đăng Nhập Quản Trị'}
          </button>
        </form>

        {!cloudActive && (
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800/80">
            Mật khẩu mặc định (LocalStorage) trong <code className="text-sky-300">src/constants/config.js</code>:{' '}
            <code className="text-amber-300">{ADMIN_PASSWORD}</code>
          </div>
        )}
      </div>
    );
  }

  if (!currentWeek) {
    return (
      <div className="max-w-lg mx-auto my-10 rounded-2xl bg-[#111733]/95 border border-purple-500/35 p-8 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="font-display font-bold text-xl text-white">
          Đã xác thực Admin Firebase
        </h2>
        {cloudAdminUser && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-3.5 py-2 text-xs text-emerald-200 space-y-0.5">
            <div>Email: <strong className="text-white">{cloudAdminUser.email}</strong></div>
            <div>UID: <code className="text-amber-300">{cloudAdminUser.uid}</code> (khớp <code className="text-sky-300">admins/{cloudAdminUser.uid}</code>)</div>
          </div>
        )}
        <p className="text-sm text-slate-300">
          Firestore chưa có tuần sự kiện nào. Bấm nút bên dưới để khởi tạo Tuần 1 và bắt đầu mở sự kiện!
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onCreateInitialWeek}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-display font-bold text-sm shadow-glow-gold"
          >
            <PlusCircle className="w-4 h-4" />
            Khởi Tạo Tuần 1
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header & Quick Actions */}
      <section className="rounded-2xl bg-gradient-to-r from-[#171842] via-[#1b153f] to-[#132047] border border-purple-500/35 shadow-glow-purple p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-200 border border-purple-400/40">
                <ShieldCheck className="w-3.5 h-3.5" />
                Khu Vực Admin
              </span>
              <EventStatusBadge isOpen={currentWeek.isOpen} />
              {cloudActive && cloudAdminUser && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/35"
                  title={`UID: ${cloudAdminUser.uid}`}
                >
                  ✓ Auth: {cloudAdminUser.email} ({cloudAdminUser.uid.slice(0, 8)}…)
                </span>
              )}
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-white">
              Quản Lý Tuần {currentWeek.weekNumber}: {currentWeek.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleOpen}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm transition ${
                currentWeek.isOpen
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/45'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/45 shadow-glow-emerald'
              }`}
            >
              {currentWeek.isOpen ? (
                <>
                  <Lock className="w-4 h-4" />
                  Đóng Sự Kiện
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Mở Sự Kiện
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setConfirmAction('end_week')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-200 border border-amber-400/40 text-sm font-semibold transition"
            >
              <PlusCircle className="w-4 h-4" />
              Kết thúc tuần &amp; Tạo tuần mới
            </button>

            <button
              type="button"
              onClick={onSeedDemoData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/30 text-xs font-semibold transition"
              title="Nạp nhanh dữ liệu mẫu để thử nghiệm"
            >
              <Sparkles className="w-4 h-4" />
              Dữ liệu mẫu
            </button>

            <button
              type="button"
              onClick={() => setConfirmAction('reset_all')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reset dữ liệu
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold transition"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Week Time Config Form */}
        <form
          onSubmit={handleSaveMeta}
          className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Tên sự kiện tuần
            </label>
            <input
              type="text"
              value={weekTitle}
              onChange={(e) => setWeekTitle(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700 focus:border-sky-400 px-3 py-2 text-sm text-white outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Thời gian bắt đầu
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700 focus:border-sky-400 px-3 py-2 text-sm text-white outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              Thời gian kết thúc
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700 focus:border-sky-400 px-3 py-2 text-sm text-white outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold text-sm transition"
            >
              <Save className="w-4 h-4" />
              Lưu Thiết Lập
            </button>
          </div>
          {metaSavedMsg && (
            <div className="sm:col-span-2 lg:col-span-4 text-xs text-emerald-300 font-medium">
              ✓ {metaSavedMsg}
            </div>
          )}
        </form>
      </section>

      {/* Admin Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm border transition ${
            activeTab === 'submissions'
              ? 'bg-sky-500/20 text-sky-200 border-sky-400/50 shadow-glow-blue'
              : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Duyệt Điểm ({counts.pending} chờ)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm border transition ${
            activeTab === 'rewards'
              ? 'bg-amber-400/20 text-amber-200 border-amber-400/50 shadow-glow-gold'
              : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Gift className="w-4 h-4" />
          Quản Lý Phần Thưởng (40 Quà)
        </button>
      </div>

      {activeTab === 'rewards' ? (
        <AdminRewardsPanel currentWeek={currentWeek} onSaveRewards={onSaveRewards} />
      ) : (
        <section className="rounded-2xl bg-[#111733]/95 border border-sky-500/30 p-5 sm:p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: `Tất cả (${counts.all})` },
                { id: SUBMISSION_STATUS.PENDING, label: `Chờ duyệt (${counts.pending})` },
                { id: SUBMISSION_STATUS.APPROVED, label: `Đã duyệt (${counts.approved})` },
                { id: SUBMISSION_STATUS.REJECTED, label: `Từ chối (${counts.rejected})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    statusFilter === tab.id
                      ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên người chơi..."
              className="sm:w-64 rounded-xl bg-slate-900 border border-slate-700 focus:border-sky-400 px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-10 text-center text-slate-400 text-sm">
              Không có lượt gửi điểm nào phù hợp.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 transition"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox({
                          open: true,
                          title: `Minh chứng của ${sub.playerName}`,
                          items: [sub],
                        })
                      }
                      className="relative group shrink-0 rounded-xl overflow-hidden border border-slate-700 hover:border-sky-400"
                    >
                      <img
                        src={sub.proofImage}
                        alt={sub.playerName}
                        className="w-20 h-20 object-cover"
                      />
                      <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                        <Eye className="w-5 h-5" />
                      </span>
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-base">{sub.playerName}</span>
                        <SubmissionStatusBadge status={sub.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateTime(sub.createdAt)}
                        </span>
                      </div>

                      {editingId === sub.id ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="number"
                            min="0"
                            value={editingScore}
                            onChange={(e) => setEditingScore(e.target.value)}
                            className="w-28 rounded-lg bg-slate-950 border border-sky-400 px-2.5 py-1 text-sm font-display font-bold text-amber-300 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => saveEditScore(sub.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="font-display font-bold text-lg text-amber-300">
                            {formatNumber(sub.score)} điểm
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditScore(sub)}
                            className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-400/25"
                          >
                            <Edit3 className="w-3 h-3" />
                            Sửa điểm
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Moderation Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onModerateSubmission(sub.id, SUBMISSION_STATUS.APPROVED)}
                      disabled={sub.status === SUBMISSION_STATUS.APPROVED}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 transition disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" />
                      Duyệt
                    </button>

                    <button
                      type="button"
                      onClick={() => onModerateSubmission(sub.id, SUBMISSION_STATUS.REJECTED)}
                      disabled={sub.status === SUBMISSION_STATUS.REJECTED}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/40 transition disabled:opacity-40"
                    >
                      <X className="w-4 h-4" />
                      Từ chối
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteSubmission(sub)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                      title="Xóa lượt gửi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#111833] border border-amber-400/40 p-6 space-y-4 shadow-glow-gold"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-lg text-white">
              {confirmAction === 'end_week'
                ? 'Kết thúc tuần hiện tại & Tạo tuần mới?'
                : 'Reset toàn bộ dữ liệu?'}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {confirmAction === 'end_week'
                ? `Tuần ${currentWeek.weekNumber} sẽ được lưu vào Lịch Sử Tuần, và hệ thống sẽ mở Tuần ${currentWeek.weekNumber + 1} hoàn toàn mới.`
                : 'Hành động này sẽ xóa toàn bộ lịch sử các tuần, bảng xếp hạng và ảnh minh chứng trên trình duyệt. Không thể hoàn tác!'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction === 'end_week') {
                    onEndWeekAndCreateNew();
                  } else {
                    onResetAll();
                  }
                  setConfirmAction(null);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-display font-bold ${
                  confirmAction === 'end_week'
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                {confirmAction === 'end_week' ? 'Xác nhận sang tuần mới' : 'Xác nhận Reset'}
              </button>
            </div>
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
