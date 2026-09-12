import React, { useState } from 'react';
import { Sparkles, Calendar, MapPin, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { getMediaSrc } from '../../services/memoryService';

export default function ThrowbackBanner({ throwbacks = [], onViewMemory }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !throwbacks || throwbacks.length === 0) return null;

  const current = throwbacks[currentIndex];
  if (!current) return null;

  const primaryPhoto = current.media?.find((m) => m.media_type === 'image') || current.media?.[0];

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % throwbacks.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + throwbacks.length) % throwbacks.length);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-indigo-500/10 border border-amber-300/50 shadow-sm p-4 sm:p-5 mb-6 transition-all hover:border-amber-400">
      {/* Subtle Golden Glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Thumbnail & Details */}
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          {/* Media preview thumbnail */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-amber-100 flex-shrink-0 border border-amber-200 shadow-sm">
            {primaryPhoto ? (
              <img
                src={getMediaSrc(primaryPhoto)}
                alt={current.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-amber-600 bg-amber-50">
                <Sparkles className="w-7 h-7" />
              </div>
            )}
            <div className="absolute top-1 left-1 bg-amber-500/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
              {current.years_ago}y Ago
            </div>
          </div>

          {/* Text details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                On This Day ({current.years_ago} {current.years_ago === 1 ? 'Year' : 'Years'} Ago)
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                <Calendar className="w-3 h-3" />
                {new Date(current.memory_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {current.location_name && (
                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium truncate">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  {current.location_name}
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {current.title}
            </h3>

            {current.story_text && (
              <p className="text-xs sm:text-sm text-slate-600 line-clamp-1 mt-0.5 font-normal">
                {current.story_text}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions and multi-throwback navigation */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {throwbacks.length > 1 && (
            <div className="flex items-center gap-1 bg-white/80 border border-amber-200 rounded-lg p-0.5 shadow-xs mr-1">
              <button
                onClick={handlePrev}
                className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-amber-100/50 transition-colors"
                title="Previous Throwback"
                aria-label="Previous throwback"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-semibold text-slate-600 px-1">
                {currentIndex + 1} / {throwbacks.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-amber-100/50 transition-colors"
                title="Next Throwback"
                aria-label="Next throwback"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => onViewMemory(current)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            Relive Memory
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition-colors"
            title="Dismiss"
            aria-label="Dismiss throwback banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
