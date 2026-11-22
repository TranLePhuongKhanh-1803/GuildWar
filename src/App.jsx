import React, { useState, useCallback, useEffect } from 'react';
import {
  Trophy,
  History,
  ShieldCheck,
  AlertTriangle,
  Cloud,
  CloudOff,
  HardDrive,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { SUBMISSION_STATUS } from './constants/config';
import { isFirebaseConfigured, firebaseInitError } from './config/firebase';
import { loadState, saveState, createNewWeek, resetAllStorage } from './utils/storage';
import { createDemoSubmissions } from './utils/demoData';
import {
  subscribeGuildWarData,
  createInitialWeekFirebase,
  addSubmissionFirebase,
  updateWeekMetaFirebase,
  toggleWeekOpenFirebase,
  moderateSubmissionFirebase,
  editSubmissionScoreFirebase,
  deleteSubmissionFirebase,
  saveRewardsFirebase,
  endWeekAndCreateNewFirebase,
  resetAllFirebase,
  seedDemoDataFirebase,
} from './services/firebaseService';
import { PokeballCrest } from './components/PokemonDecor';
import PlayerView from './components/PlayerView';
import HistoryView from './components/HistoryView';
import AdminView from './components/AdminView';

export default function App() {
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const cloudActive = isFirebaseConfigured && !useLocalFallback;

  const [appState, setAppState] = useState(() =>
    cloudActive ? { currentWeek: createNewWeek(1), history: [] } : loadState()
  );
  const [cloudStatus, setCloudStatus] = useState(() => {
    if (!isFirebaseConfigured) return 'local';
    if (firebaseInitError) return 'error';
    return 'connecting';
  });
  const [syncError, setSyncError] = useState(() =>
    firebaseInitError ? `Lỗi khởi tạo Firebase: ${firebaseInitError.message}` : ''
  );
  const [retryTick, setRetryTick] = useState(0);
  const [activeView, setActiveView] = useState('player'); // 'player' | 'history' | 'admin'

  useEffect(() => {
    if (!cloudActive) {
      setCloudStatus('local');
      setAppState(loadState());
      return undefined;
    }

    if (firebaseInitError) {
      setCloudStatus('error');
      setSyncError(`Lỗi khởi tạo Firebase: ${firebaseInitError.message}`);
      return undefined;
    }

    setCloudStatus('connecting');
    setSyncError('');

    const unsubscribe = subscribeGuildWarData(
      (cloudState) => {
        setAppState(cloudState);
        setCloudStatus('connected');
        setSyncError('');
      },
      (err) => {
        setCloudStatus('error');
        setSyncError(
          `Lỗi kết nối Cloud Firestore: ${err?.message || 'Không thể đồng bộ dữ liệu.'}`
        );
      }
    );

    return () => unsubscribe();
  }, [cloudActive, retryTick]);

  const updateLocalAndPersist = useCallback((updater) => {
    let persistResult = { ok: true };
    setAppState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistResult = saveState(next);
      if (!persistResult.ok) {
        setSyncError(persistResult.error);
        return prev;
      }
      setSyncError('');
      return next;
    });
    return persistResult;
  }, []);

  const runCloudAction = async (actionFn, fallbackLabel) => {
    try {
      await actionFn();
      setSyncError('');
    } catch (err) {
      setSyncError(`${fallbackLabel}: ${err?.message || 'Lỗi kết nối Firebase.'}`);
    }
  };

  const handleAddSubmission = async ({ playerName, score, proofImage }) => {
    if (cloudActive) {
      if (cloudStatus !== 'connected') {
        return {
          ok: false,
          error: 'Chưa kết nối được với Firebase Cloud. Vui lòng kiểm tra mạng hoặc cấu hình.',
        };
      }
      try {
        await addSubmissionFirebase({
          weekId: appState.currentWeek.id,
          playerName,
          score,
          proofImage,
        });
        return { ok: true };
      } catch (err) {
        return { ok: false, error: `Lỗi tải lên Firebase: ${err?.message || 'Thử lại sau.'}` };
      }
    }

    const newSub = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerName,
      score,
      proofImage,
      status: SUBMISSION_STATUS.PENDING,
      createdAt: new Date().toISOString(),
    };

    return updateLocalAndPersist((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        submissions: [newSub, ...prev.currentWeek.submissions],
      },
    }));
  };

  const handleUpdateWeekMeta = async ({ title, startTime, endTime }) => {
    if (cloudActive) {
      await runCloudAction(
        () => updateWeekMetaFirebase(appState.currentWeek.id, { title, startTime, endTime }),
        'Không thể cập nhật thông tin tuần'
      );
      return;
    }
    updateLocalAndPersist((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        title,
        startTime,
        endTime,
      },
    }));
  };

  const handleToggleOpen = async () => {
    if (cloudActive) {
      await runCloudAction(
        () => toggleWeekOpenFirebase(appState.currentWeek.id, !appState.currentWeek.isOpen),
        'Không thể thay đổi trạng thái sự kiện'
      );
      return;
    }
    updateLocalAndPersist((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        isOpen: !prev.currentWeek.isOpen,
      },
    }));
  };

  const handleModerateSubmission = async (id, status) => {
    if (cloudActive) {
      await runCloudAction(
        () => moderateSubmissionFirebase(id, status),
        'Không thể cập nhật trạng thái duyệt'
      );
      return;
    }
    updateLocalAndPersist((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        submissions: prev.currentWeek.submissions.map((s) =>
          s.id === id ? { ...s, status } : s
        ),
      },
    }));
  };

  const handleEditSubmissionScore = async (id, newScore) => {
    if (cloudActive) {
      await runCloudAction(
        () => editSubmissionScoreFirebase(id, newScore),
        'Không thể chỉnh sửa điểm'
      );
      return;
    }
    updateLocalAndPersist((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        submissions: prev.currentWeek.submissions.map((s) =>
          s.id === id ? { ...s, score: newScore } : s
        ),
      },
    }));
  };

  const handleDeleteSubmission = async (sub) => {
    if (cloudActive) {
      await runCloudAction(
        () => deleteSubmissionFirebase(sub),
        'Không thể xóa lượt nộp'
      );
      return;
    }
    updateLocalAndPersist((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        submissions: prev.currentWeek.submissions.filter((s) => s.id !== sub.id),
      },
    }));
  };

  const handleSaveRewards = async (rewards) => {
    if (cloudActive) {
      await runCloudAction(
        () => saveRewardsFirebase(appState.currentWeek.id, rewards),
        'Không thể lưu danh sách phần thưởng'
      );
      return;
    }
    updateLocalAndPersist((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        rewards,
      },
    }));
  };

  const handleEndWeekAndCreateNew = async () => {
    if (cloudActive) {
      await runCloudAction(
        () => endWeekAndCreateNewFirebase(appState.currentWeek),
        'Không thể kết thúc tuần'
      );
      return;
    }
    updateLocalAndPersist((prev) => {
      const archivedWeek = {
        ...prev.currentWeek,
        isOpen: false,
        endedAt: new Date().toISOString(),
      };
      const nextWeekNumber = (prev.currentWeek.weekNumber || 1) + 1;
      return {
        currentWeek: createNewWeek(nextWeekNumber),
        history: [archivedWeek, ...prev.history],
      };
    });
  };

  const handleResetAll = async () => {
    if (cloudActive) {
      await runCloudAction(() => resetAllFirebase(), 'Không thể reset dữ liệu Firebase');
      return;
    }
    const fresh = resetAllStorage();
    saveState(fresh);
    setSyncError('');
    setAppState(fresh);
  };

  const handleSeedDemoData = async () => {
    if (cloudActive) {
      await runCloudAction(
        () => seedDemoDataFirebase(appState.currentWeek.id),
        'Không thể nạp dữ liệu mẫu lên Firebase'
      );
      return;
    }
    const demos = createDemoSubmissions();
    updateLocalAndPersist((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        submissions: [...demos, ...prev.currentWeek.submissions],
      },
    }));
  };

  const pendingCount = (appState.currentWeek?.submissions || []).filter(
    (s) => s.status === SUBMISSION_STATUS.PENDING
  ).length;

  const renderCloudBadge = () => {
    if (cloudStatus === 'connected') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/35"
          title="Đang đồng bộ thời gian thực qua Firebase Firestore & Storage"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <Cloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cloud Sync: Đã kết nối</span>
        </span>
      );
    }
    if (cloudStatus === 'connecting') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/35">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden sm:inline">Đang kết nối Cloud...</span>
        </span>
      );
    }
    if (cloudStatus === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-400/40">
          <CloudOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cloud Sync: Lỗi kết nối</span>
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/90 text-slate-300 border border-slate-700"
        title="Đang chạy bằng LocalStorage dự phòng"
      >
        <HardDrive className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {useLocalFallback ? 'LocalStorage (Dự phòng)' : 'LocalStorage'}
        </span>
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#090d1f]/85 border-b border-indigo-500/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView('player')}
              className="flex items-center gap-3 text-left group"
            >
              <PokeballCrest className="w-10 h-10 group-hover:scale-105 transition-transform" />
              <div>
                <div className="font-display font-bold text-base sm:text-lg tracking-wider bg-gradient-to-r from-sky-300 via-purple-300 to-amber-300 bg-clip-text text-transparent">
                  GUILD WAR
                </div>
                <div className="text-[11px] uppercase tracking-widest text-slate-400">
                  Weekly Ranking &amp; Rewards
                </div>
              </div>
            </button>

            {renderCloudBadge()}
          </div>

          <nav className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveView('player')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeView === 'player'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-glow-blue'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Người Chơi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('history')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeView === 'history'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Lịch Sử ({appState.history.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeView === 'admin'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold shadow-glow-gold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
              {pendingCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Sync / Storage Warning if any */}
      {syncError && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-4">
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-3 text-sm text-rose-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{syncError}</span>
            </div>
            {isFirebaseConfigured && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseLocalFallback(false);
                    setRetryTick((t) => t + 1);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/35 text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Thử lại Firebase
                </button>
                {!useLocalFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseLocalFallback(true);
                      setSyncError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Dùng LocalStorage dự phòng
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {cloudStatus === 'connecting' ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-sky-300">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="font-display font-semibold text-sm">
              Đang kết nối &amp; đồng bộ dữ liệu từ Firebase Cloud Firestore...
            </p>
          </div>
        ) : cloudStatus === 'error' ? (
          <div className="max-w-lg mx-auto my-12 rounded-2xl bg-[#111733]/95 border border-rose-500/40 p-6 text-center space-y-4">
            <CloudOff className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="font-display font-bold text-xl text-white">
              Không thể kết nối Firebase Cloud
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Hệ thống không giả lập dữ liệu đồng bộ khi mất kết nối Firebase. Hãy kiểm tra lại
              Firestore Rules, mạng Internet hoặc cấu hình trong <code className="text-sky-300">.env.local</code>.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRetryTick((t) => t + 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Thử kết nối lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseLocalFallback(true);
                  setSyncError('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold"
              >
                <HardDrive className="w-4 h-4" />
                Chuyển sang LocalStorage dự phòng
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeView === 'player' && (
              <PlayerView
                currentWeek={appState.currentWeek}
                onAddSubmission={handleAddSubmission}
              />
            )}

            {activeView === 'history' && <HistoryView history={appState.history} />}

            {activeView === 'admin' && (
              <AdminView
                cloudActive={cloudActive}
                currentWeek={appState.currentWeek}
                onCreateInitialWeek={() =>
                  runCloudAction(
                    () => createInitialWeekFirebase(),
                    'Không thể khởi tạo Tuần 1'
                  )
                }
                onUpdateWeekMeta={handleUpdateWeekMeta}
                onToggleOpen={handleToggleOpen}
                onModerateSubmission={handleModerateSubmission}
                onEditSubmissionScore={handleEditSubmissionScore}
                onDeleteSubmission={handleDeleteSubmission}
                onSaveRewards={handleSaveRewards}
                onEndWeekAndCreateNew={handleEndWeekAndCreateNew}
                onResetAll={handleResetAll}
                onSeedDemoData={handleSeedDemoData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        GUILD WAR – Weekly Ranking &amp; Rewards •{' '}
        {cloudStatus === 'connected'
          ? 'Cloud Sync: Đã kết nối Firebase Firestore & Storage (thời gian thực)'
          : cloudStatus === 'error'
            ? 'Cloud Sync: Mất kết nối Firebase'
            : 'Chế độ LocalStorage dự phòng'}
      </footer>
    </div>
  );
}
