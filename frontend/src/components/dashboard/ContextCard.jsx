import { useState } from 'react';
import { Sun, Sunset, Moon, Plus, Check } from 'lucide-react';
import taskService from '../../services/taskService';
import './ContextCard.css';

const MOODS = [
  { rating: 1, emoji: '😫', label: 'Exhausted' },
  { rating: 2, emoji: '😐', label: 'Neutral' },
  { rating: 3, emoji: '⚡', label: 'Productive' },
  { rating: 4, emoji: '🧘', label: 'Calm' },
  { rating: 5, emoji: '🏆', label: 'Unstoppable' },
];

function getTimeMode() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'day';
  return 'evening';
}

function getGreeting(name) {
  const mode = getTimeMode();
  const first = name?.split(' ')[0] || 'there';
  if (mode === 'morning') return `Good morning, ${first} ☀️`;
  if (mode === 'day')     return `Keep going, ${first} 💪`;
  return `Great work today, ${first} 🌙`;
}

export default function ContextCard({
  userName,
  nonNegotiables,
  setNonNegotiable,
  moodRating,
  setMood,
  dailyWin,
  setDailyWin,
  completeEvening,
  eveningDone,
  activeTasks = [],
  deepWorkHours = 0,
  hydration = { current: 0, target: 8 },
}) {
  const mode = getTimeMode();
  const [pushed, setPushed] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [checkInStarted, setCheckInStarted] = useState(false);

  const pushNonNegotiables = async () => {
    const items = (nonNegotiables || []).filter(s => s.trim());
    if (!items.length) return;
    setPushing(true);
    try {
      await Promise.all(items.map(title =>
        taskService.createTask({ text: title, priority: 'high' })
      ));
      setPushed(true);
    } catch { /* silently fail */ }
    setPushing(false);
  };

  const startCheckIn = () => {
    setCheckInStarted(true);
    let t = 60;
    const id = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) clearInterval(id);
    }, 1000);
  };

  /* ---- Morning ---- */
  if (mode === 'morning') {
    return (
      <div className="card panel context-card ctx-morning">
        <div className="ctx-header">
          <Sun size={20} className="ctx-icon-sun" />
          <div>
            <h2 className="ctx-greeting">{getGreeting(userName)}</h2>
            <p className="ctx-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="ctx-trio">
          <p className="ctx-trio-label">✨ Non-Negotiable Trio — what makes today a win?</p>
          {[0, 1, 2].map(i => (
            <div key={i} className="ctx-trio-row">
              <span className="ctx-trio-num">{i + 1}</span>
              <input
                className="input ctx-trio-input"
                placeholder={['First priority…', 'Second priority…', 'Third priority…'][i]}
                value={nonNegotiables?.[i] ?? ''}
                onChange={e => setNonNegotiable(i, e.target.value)}
              />
            </div>
          ))}

          {pushed ? (
            <p className="ctx-pushed"><Check size={14} /> Added to today's planner!</p>
          ) : (
            <button
              className="btn btn-primary ctx-push-btn"
              onClick={pushNonNegotiables}
              disabled={pushing || !(nonNegotiables || []).some(s => s.trim())}
            >
              {pushing ? 'Adding…' : <><Plus size={14} /> Push to Planner</>}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---- Day ---- */
  if (mode === 'day') {
    return (
      <div className="card panel context-card ctx-day">
        <div className="ctx-header">
          <Sunset size={20} className="ctx-icon-day" />
          <div>
            <h2 className="ctx-greeting">{getGreeting(userName)}</h2>
            <p className="ctx-date">Here's your midday snapshot</p>
          </div>
        </div>

        <div className="ctx-day-stats">
          <div className="ctx-stat">
            <span className="ctx-stat-val">{activeTasks.length}</span>
            <span className="ctx-stat-key">Tasks left</span>
          </div>
          <div className="ctx-stat">
            <span className="ctx-stat-val">{deepWorkHours}</span>
            <span className="ctx-stat-key">hrs deep work</span>
          </div>
          <div className="ctx-stat">
            <span className="ctx-stat-val">{hydration.current}/{hydration.target}</span>
            <span className="ctx-stat-key">glasses</span>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Evening ---- */
  return (
    <div className="card panel context-card ctx-evening">
      <div className="ctx-header">
        <Moon size={20} className="ctx-icon-moon" />
        <div>
          <h2 className="ctx-greeting">{getGreeting(userName)}</h2>
          <p className="ctx-date">60-second end-of-day reflection</p>
        </div>
      </div>

      {eveningDone ? (
        <p className="ctx-done">✅ Day complete! Rest well — tomorrow's a fresh start.</p>
      ) : !checkInStarted ? (
        <button className="btn btn-secondary ctx-start-btn" onClick={startCheckIn}>
          Begin Evening Check-In ✨
        </button>
      ) : (
        <div className="ctx-evening-form">
          {timeLeft > 0 && (
            <div className="ctx-timer-pill">{timeLeft}s remaining</div>
          )}

          <div className="ctx-mood-section">
            <p className="ctx-mood-label">How do you feel?</p>
            <div className="ctx-moods">
              {MOODS.map(m => (
                <button
                  key={m.rating}
                  className={`ctx-mood-btn ${moodRating === m.rating ? 'ctx-mood-active' : ''}`}
                  onClick={() => setMood(m.rating)}
                  title={m.label}
                  aria-label={m.label}
                >
                  <span className="ctx-mood-emoji">{m.emoji}</span>
                  <span className="ctx-mood-name">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ctx-win-section">
            <label className="ctx-win-label" htmlFor="daily-win">🏅 One win from today:</label>
            <textarea
              id="daily-win"
              className="input ctx-win-input"
              placeholder="I completed…"
              rows={2}
              value={dailyWin}
              onChange={e => setDailyWin(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary ctx-complete-btn"
            onClick={completeEvening}
            disabled={!moodRating}
          >
            ✅ Complete Day
          </button>
        </div>
      )}
    </div>
  );
}
