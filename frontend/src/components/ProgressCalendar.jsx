import './ProgressCalendar.css';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function indicatorFor(day) {
  if (!day || day.totalCount === 0) return null;
  if (day.percentage >= 70) return 'high';
  if (day.percentage > 0) return 'partial';
  return 'none';
}

export default function ProgressCalendar({ year, month, days, selectedDate, todayStr, onSelectDate, onPrevMonth, onNextMonth }) {
  const dayByDate = new Map((days || []).map((d) => [d.date, d]));

  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  return (
    <div className="progress-calendar">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={onPrevMonth} aria-label="Previous month">&#8249;</button>
        <p className="calendar-title">{MONTH_LABELS[month - 1]} {year}</p>
        <button className="calendar-nav-btn" onClick={onNextMonth} aria-label="Next month">&#8250;</button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((w) => <span key={w}>{w}</span>)}
      </div>

      <div className="calendar-grid">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} className="calendar-cell calendar-cell-empty" />;
          const day = dayByDate.get(dateStr);
          const indicator = indicatorFor(day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          return (
            <button
              key={dateStr}
              className={`calendar-cell ${isToday ? 'calendar-cell-today' : ''} ${isSelected ? 'calendar-cell-selected' : ''}`}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="calendar-cell-num">{Number(dateStr.slice(-2))}</span>
              {indicator && <span className={`calendar-dot calendar-dot-${indicator}`} />}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span><span className="calendar-dot calendar-dot-high" /> High</span>
        <span><span className="calendar-dot calendar-dot-partial" /> Partial</span>
        <span><span className="calendar-dot calendar-dot-none" /> None</span>
      </div>
    </div>
  );
}