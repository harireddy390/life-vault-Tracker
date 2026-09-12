import React from 'react';
import { Camera, Image, Sparkles, Lock, Plus, Search, Star } from 'lucide-react';

export default function MemoryStatsBar({
  stats = { total_memories: 0, total_media: 0, years_chronicled: 0, locked_capsules: 0, favorite_memories: 0 },
  searchQuery = '',
  onSearchChange = () => {},
  onCreateMemory = () => {},
  onCreateTimeCapsule = () => {},
  activeFavoriteOnly = false,
  onToggleFavorites = () => {},
}) {
  return (
    <div className="space-y-4 mb-6">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Memories &amp; Life Timeline
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Life Capsule
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Chronicle life milestones, travel albums, and sealed digital time capsules with zero compression.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onToggleFavorites(!activeFavoriteOnly)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeFavoriteOnly
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${activeFavoriteOnly ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            Favorites
          </button>

          <button
            onClick={onCreateTimeCapsule}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
            title="Seal a memory until a future date"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            Lock Capsule
          </button>

          <button
            onClick={onCreateMemory}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </button>
        </div>
      </div>

      {/* KPI Metric Pills Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Memories */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Memories</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {stats.total_memories || 0}
            </p>
          </div>
        </div>

        {/* Media Items */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
            <Image className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Media Files</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {stats.total_media || 0}
            </p>
          </div>
        </div>

        {/* Years Chronicled */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Years Active</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {stats.years_chronicled || 0} <span className="text-xs font-normal text-slate-400">yrs</span>
            </p>
          </div>
        </div>

        {/* Sealed Capsules */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Time Capsules</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {stats.locked_capsules || 0} <span className="text-xs font-normal text-slate-400">sealed</span>
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search memories by title, story excerpt, location, or tag..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
