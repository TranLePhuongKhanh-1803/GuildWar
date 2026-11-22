import React from 'react';
import { Crown, Award, Medal, Lock, Unlock } from 'lucide-react';

export function PokeballCrest({ className = 'w-9 h-9' }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pkTop" x1="8" y1="8" x2="56" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id="pkGold" x1="20" y1="20" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="#0F172A" stroke="url(#pkGold)" strokeWidth="2.5" />
      <path d="M5 32C5 17.088 17.088 5 32 5C46.912 5 59 17.088 59 32H5Z" fill="url(#pkTop)" />
      <rect x="4" y="29" width="56" height="6" fill="#090D1F" />
      <circle cx="32" cy="32" r="10" fill="#090D1F" stroke="url(#pkGold)" strokeWidth="3" />
      <circle cx="32" cy="32" r="5" fill="url(#pkGold)" />
    </svg>
  );
}

export function RankMedal({ rank }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 text-slate-950 shadow-glow-gold font-display font-bold">
        <Crown className="w-5 h-5" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-900 shadow font-display font-bold">
        <Award className="w-5 h-5" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 via-orange-500 to-amber-800 text-amber-50 shadow font-display font-bold">
        <Medal className="w-5 h-5" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 font-display font-bold text-sm">
      #{rank}
    </span>
  );
}

export function EventStatusBadge({ isOpen, size = 'md' }) {
  const padding = size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs';
  if (isOpen) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full font-semibold tracking-wide uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 shadow-glow-emerald ${padding}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <Unlock className="w-3.5 h-3.5" />
        Đang mở
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-semibold tracking-wide uppercase bg-rose-500/15 text-rose-300 border border-rose-400/40 ${padding}`}
    >
      <Lock className="w-3.5 h-3.5" />
      Đã đóng
    </span>
  );
}

export function SubmissionStatusBadge({ status }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        Đã duyệt
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
        Từ chối
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
      Chờ duyệt
    </span>
  );
}
