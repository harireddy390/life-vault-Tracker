import React from 'react';
import { Tag, Smile, Calendar } from 'lucide-react';

const MOOD_OPTIONS = [
  { value: 'Joyful', label: 'Joyful', emoji: '😊' },
  { value: 'Grateful', label: 'Grateful', emoji: '🙏' },
  { value: 'Adventurous', label: 'Adventurous', emoji: '🗺️' },
  { value: 'Peaceful', label: 'Peaceful', emoji: '🌿' },
  { value: 'Nostalgic', label: 'Nostalgic', emoji: '🕰️' },
  { value: 'Accomplished', label: 'Accomplished', emoji: '🏆' },
];

const PRESET_TAGS = ['Travel', 'Milestone', 'Family', 'Friends', 'Work', 'Creative', 'Holiday'];

export default function TimelineRail({
  activeTag = '',
  onSelectTag = () => {},
  activeMood = '',
  onSelectMood = () => {},
  availableYears = [],
  activeYear = '',
  onSelectYear = () => {},
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs mb-6 space-y-3">
      {/* Category / Tags Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pr-1 flex-shrink-0">
          <Tag className="w-3.5 h-3.5 text-indigo-600" />
          <span>Tags:</span>
        </div>

        <button
          onClick={() => onSelectTag('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            !activeTag
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
          }`}
        >
          All Tags
        </button>

        {PRESET_TAGS.map((tag) => {
          const isSelected = activeTag.toLowerCase() === tag.toLowerCase();
          return (
            <button
              key={tag}
              onClick={() => onSelectTag(isSelected ? '' : tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              #{tag}
            </button>
          );
        })}
      </div>

      {/* Moods Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pr-1 flex-shrink-0">
          <Smile className="w-3.5 h-3.5 text-amber-500" />
          <span>Mood:</span>
        </div>

        <button
          onClick={() => onSelectMood('')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
            !activeMood
              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Any Mood
        </button>

        {MOOD_OPTIONS.map((m) => {
          const isSelected = activeMood === m.value;
          return (
            <button
              key={m.value}
              onClick={() => onSelectMood(isSelected ? '' : m.value)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Year Jump Pills Row (if timeline spans multiple years) */}
      {availableYears.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 pr-1 flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Year:</span>
          </div>

          <button
            onClick={() => onSelectYear('')}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase transition-all ${
              !activeYear ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Years
          </button>

          {availableYears.map((year) => {
            const isSelected = String(activeYear) === String(year);
            return (
              <button
                key={year}
                onClick={() => onSelectYear(isSelected ? '' : year)}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                  isSelected ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
