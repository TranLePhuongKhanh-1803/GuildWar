import React from 'react';
import { X, Calendar, Trophy, Image as ImageIcon } from 'lucide-react';
import { formatDateTime, formatNumber } from '../utils/ranking';
import { SubmissionStatusBadge } from './PokemonDecor';

export default function ProofLightbox({ isOpen, onClose, title, items = [] }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#111833] border border-indigo-500/35 shadow-glow-purple p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">{title || 'Ảnh minh chứng'}</h3>
              <p className="text-xs text-slate-400">{items.length} ảnh minh chứng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {items.length === 0 ? (
            <p className="text-center text-slate-400 py-8">Không có ảnh minh chứng nào.</p>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id || index}
                className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">{item.playerName}</span>
                    <span className="inline-flex items-center gap-1 text-amber-300 font-display font-bold text-sm">
                      <Trophy className="w-4 h-4" />
                      {formatNumber(item.score)} điểm
                    </span>
                    {item.status && <SubmissionStatusBadge status={item.status} />}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
                <div className="p-3 bg-black/40 flex justify-center">
                  {item.proofImage ? (
                    <img
                      src={item.proofImage}
                      alt={`Minh chứng của ${item.playerName}`}
                      className="max-h-[60vh] w-auto rounded-lg object-contain border border-slate-800"
                    />
                  ) : (
                    <div className="py-12 text-slate-500 text-sm">Không có hình ảnh</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
