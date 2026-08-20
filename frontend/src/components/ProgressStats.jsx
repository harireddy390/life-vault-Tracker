export default function ProgressStats({ overview = null, stats = null }) {
  const currentStreak = overview?.currentStreak ?? stats?.currentStreak ?? 0;
  const bestStreak = overview?.bestStreak ?? stats?.bestStreak ?? 0;
  const totalCompleted = overview?.totalCompletedTasks ?? stats?.totalCompletions ?? 0;
  const averageCompletion = overview?.averageCompletion ?? 0;
  const activeDays = overview?.activeDaysCount ?? stats?.totalActiveDays ?? 0;

  return (
    <div className="progress-stats-grid">
      <div className="card stat-card">
        <div className="stat-icon-wrap icon-fire">🔥</div>
        <div className="stat-info">
          <span className="stat-value">{currentStreak} <span className="stat-unit">days</span></span>
          <span className="stat-title">Current Streak</span>
        </div>
      </div>

      <div className="card stat-card">
        <div className="stat-icon-wrap icon-trophy">🏆</div>
        <div className="stat-info">
          <span className="stat-value">{bestStreak} <span className="stat-unit">days</span></span>
          <span className="stat-title">Best Streak</span>
        </div>
      </div>

      <div className="card stat-card">
        <div className="stat-icon-wrap icon-chart">📈</div>
        <div className="stat-info">
          <span className="stat-value">{averageCompletion}%</span>
          <span className="stat-title">Month Avg. Completion</span>
        </div>
      </div>

      <div className="card stat-card">
        <div className="stat-icon-wrap icon-check">✅</div>
        <div className="stat-info">
          <span className="stat-value">{totalCompleted}</span>
          <span className="stat-title">Tasks Completed</span>
        </div>
      </div>
    </div>
  );
}
