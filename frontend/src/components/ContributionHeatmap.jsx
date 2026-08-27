import { useMemo } from 'react';
import './ContributionHeatmap.css';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function levelFor(day) {
  if (!day || day.totalCount === 0) return 0;
  if (day.percentage >= 75) return 4;
  if (day.percentage >= 50) return 3;
  if (day.percentage >= 25) return 2;
  return 1;
}

export default function ContributionHeatmap({ year, days, todayStr, onPrevYear, onNextYear }) {
  const { weeks, monthMarkers, totalCompletions } = useMemo(() => {
    const dayByDate = new Map((days || []).map((d) => [d.date, d]));

    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const gridStart = new Date(jan1);
    gridStart.setDate(gridStart.getDate() - jan1.getDay());
    const gridEnd = new Date(dec31);
    gridEnd.setDate(gridEnd.getDate() + (6 - dec31.getDay()));

    const weeksArr = [];
    let currentWeek = [];
    let totalCompletions = 0;
    const monthMarkers = [];
    let lastMonthSeen = -1;

    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const inYear = d.getFullYear() === year;
      const dayData = inYear ? dayByDate.get(dateStr) : null;

      if (dayData) totalCompletions += dayData.completedCount;

      if (currentWeek.length === 0 && inYear && d.getMonth() !== lastMonthSeen) {
        monthMarkers.push({ weekIndex: weeksArr.length, label: MONTH_LABELS[d.getMonth()] });
        lastMonthSeen = d.getMonth();
      }

      currentWeek.push({ date: dateStr, inYear, data: dayData });
      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    }

    return { weeks: weeksArr, monthMarkers, totalCompletions };
  }, [year, days]);

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-header">
        <div>
          <p className="heatmap-title">{totalCompletions} completions in {year}</p>
        </div>
        <div className="heatmap-year-nav">
          <button className="calendar-nav-btn" onClick={onPrevYear} aria-label="Previous year">&#8249;</button>
          <span className="heatmap-year-label">{year}</span>
          <button className="calendar-nav-btn" onClick={onNextYear} aria-label="Next year">&#8250;</button>
        </div>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap-months">
          {monthMarkers.map((m, i) => (
            <span key={i} className="heatmap-month-label" style={{ gridColumnStart: m.weekIndex + 1 }}>{m.label}</span>
          ))}
        </div>
        <div className="heatmap-grid">
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap-col">
              {week.map((cell, di) => {
                const level = cell.inYear ? levelFor(cell.data) : null;
                const isToday = cell.date === todayStr;
                const title = cell.inYear
                  ? cell.data
                    ? `${cell.date}: ${cell.data.completedCount}/${cell.data.totalCount} completed (${cell.data.percentage}%)`
                    : `${cell.date}: no data`
                  : '';
                return (
                  <div
                    key={di}
                    className={`heatmap-cell ${level !== null ? `heatmap-level-${level}` : 'heatmap-cell-outside'} ${isToday ? 'heatmap-cell-today' : ''}`}
                    title={title}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        <span className="heatmap-cell heatmap-level-0" />
        <span className="heatmap-cell heatmap-level-1" />
        <span className="heatmap-cell heatmap-level-2" />
        <span className="heatmap-cell heatmap-level-3" />
        <span className="heatmap-cell heatmap-level-4" />
        <span>More</span>
      </div>
    </div>
  );
}