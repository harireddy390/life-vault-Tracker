import React, { useState, useMemo } from 'react';
import { Calendar, Flame } from 'lucide-react';

export default function ActivityHeatmap365({ heatmapData = [] }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [hoveredCell, setHoveredCell] = useState(null);

  const filters = [
    { id: 'all', label: 'All Modules' },
    { id: 'habits', label: 'Habits' },
    { id: 'goals', label: 'Goals' },
    { id: 'health', label: 'Health' },
    { id: 'vault', label: 'Vault' }
  ];

  const { weeks, monthLabels, totalCompletions, maxStreak } = useMemo(() => {
    let completionsCount = 0;
    let currentStreak = 0;
    let maxStr = 0;

    const dateMap = new Map();
    heatmapData.forEach((item) => {
      dateMap.set(item.date_key, item);
      completionsCount += item.count || 0;
      if (item.count > 0) {
        currentStreak++;
        if (currentStreak > maxStr) maxStr = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    const days = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const found = dateMap.get(dateKey) || {
        date_key: dateKey,
        count: 0,
        level: 0,
        breakdown: { habits: 0, goals: 0, health: 0, vault: 0 }
      };

      let activeCount = found.count;
      let activeLevel = found.level;

      if (selectedFilter !== 'all') {
        activeCount = found.breakdown?.[selectedFilter] || 0;
        activeLevel = activeCount >= 4 ? 4 : activeCount >= 3 ? 3 : activeCount >= 2 ? 2 : activeCount > 0 ? 1 : 0;
      }

      days.push({
        date: d,
        dateKey,
        dayOfWeek: d.getDay(),
        count: activeCount,
        level: activeLevel,
        breakdown: found.breakdown || {}
      });
    }

    const weeksArr = [];
    let currentWeek = [];

    const firstDay = days[0].date.getDay();
    const mondayOffset = (firstDay + 6) % 7;
    for (let p = 0; p < mondayOffset; p++) {
      currentWeek.push(null);
    }

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeksArr.push(currentWeek);
    }

    const months = [];
    let lastMonth = -1;
    weeksArr.forEach((week, wIdx) => {
      const firstValidDay = week.find((d) => d !== null);
      if (firstValidDay) {
        const m = firstValidDay.date.getMonth();
        if (m !== lastMonth) {
          months.push({
            name: firstValidDay.date.toLocaleString('default', { month: 'short' }),
            weekIndex: wIdx
          });
          lastMonth = m;
        }
      }
    });

    return {
      weeks: weeksArr,
      monthLabels: months,
      totalCompletions: completionsCount,
      maxStreak: maxStr
    };
  }, [heatmapData, selectedFilter]);

  // Clean light-mode emerald color tiers matching Health & Habits
  const getCellColor = (level) => {
    switch (level) {
      case 4:
        return 'bg-emerald-600 border border-emerald-700 shadow-sm';
      case 3:
        return 'bg-emerald-500 border border-emerald-600';
      case 2:
        return 'bg-emerald-300 border border-emerald-400';
      case 1:
        return 'bg-emerald-100 border border-emerald-200';
      case 0:
      default:
        return 'bg-slate-100 border border-slate-200/80';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8 transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">365-Day Activity Heatmap</h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
              {totalCompletions} Total Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Cross-system momentum matrix across all personal modules</p>
        </div>

        {/* Filter Pills (Matching category pill style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedFilter === f.id
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative overflow-x-auto pb-3">
        <div className="min-w-[760px]">
          
          {/* Month Header row */}
          <div className="flex text-[10px] text-slate-400 font-semibold mb-2 pl-7">
            {monthLabels.map((m, idx) => (
              <span
                key={idx}
                style={{
                  position: 'relative',
                  left: `${m.weekIndex * 14}px`,
                  marginRight: idx < monthLabels.length - 1 ? 0 : 'auto'
                }}
                className="inline-block"
              >
                {m.name}
              </span>
            ))}
          </div>

          {/* Days Grid with Day Labels on Left */}
          <div className="flex gap-1.5">
            {/* Day of Week Labels */}
            <div className="flex flex-col justify-between text-[9px] font-bold text-slate-400 pr-2 pt-0.5 h-[98px]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Matrix of Squares */}
            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => {
                    if (!day) {
                      return <div key={dIdx} className="w-3 h-3 rounded-sm bg-transparent" />;
                    }

                    return (
                      <div
                        key={day.dateKey}
                        className={`w-3 h-3 rounded-sm transition-transform hover:scale-125 hover:z-20 cursor-pointer ${getCellColor(day.level)}`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCell({
                            day,
                            x: rect.left + window.scrollX,
                            y: rect.top + window.scrollY
                          });
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Heatmap Legend & Summary Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-700">
            <Flame className="w-4 h-4 text-amber-500" />
            Longest Streak: <strong className="text-slate-900">{maxStreak} Days</strong>
          </span>
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center gap-2 text-[11px]">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-200" />
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-200" />
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300 border border-emerald-400" />
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 border border-emerald-600" />
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 border border-emerald-700 shadow-sm" />
          <span>More</span>
        </div>
      </div>

      {/* Floating Hover Tooltip (Dark charcoal floating box with high contrast) */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-slate-900/95 text-white border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs w-48 animate-in fade-in duration-150"
          style={{ left: hoveredCell.x, top: hoveredCell.y - 8 }}
        >
          <div className="font-bold text-white mb-1 border-b border-white/10 pb-1 flex justify-between items-center">
            <span>{hoveredCell.day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-[10px] font-mono text-indigo-400 font-bold">{hoveredCell.day.count} actions</span>
          </div>

          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Habits:</span>
              <span className="font-semibold text-emerald-400">{hoveredCell.day.breakdown.habits || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Goals:</span>
              <span className="font-semibold text-indigo-400">{hoveredCell.day.breakdown.goals || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Health:</span>
              <span className="font-semibold text-purple-400">{hoveredCell.day.breakdown.health || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vault:</span>
              <span className="font-semibold text-amber-400">{hoveredCell.day.breakdown.vault || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
