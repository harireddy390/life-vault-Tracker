import { useEffect, useState } from 'react';
import { toLocalDateString } from '../utils/date';
import stepService from '../services/stepService';


export default function StepCounter({ target = 10000 }) {
  const today = toLocalDateString();
  const [todaySteps, setTodaySteps] = useState(0);
  const [inputSteps, setInputSteps] = useState('');
  const [logs, setLogs] = useState([]);

  // Load logs on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await stepService.getSteps();
        setLogs(data);
        const todayLog = data.find((l) => l.date === today);
        setTodaySteps(todayLog ? todayLog.steps : 0);
        setInputSteps(todayLog ? String(todayLog.steps) : '');
      } catch (err) {
        console.error('Failed to load steps', err);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    const stepsNum = Number(inputSteps);
    if (isNaN(stepsNum) || stepsNum < 0) return;
    try {
      await stepService.logSteps(today, stepsNum);
      setTodaySteps(stepsNum);
      // Refresh logs
      const data = await stepService.getSteps();
      setLogs(data);
    } catch (err) {
      console.error('Failed to save steps', err);
    }
  };

  const percentage = Math.min(100, Math.round((todaySteps / target) * 100));

  // Show recent 7 days (sorted newest first)
  const recent = logs
    .filter((l) => l.steps != null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 7);

  return (
    <div className="step-counter card">
      <h2 className="step-header text-lg font-semibold mb-3">Daily Steps</h2>
      <div className="step-ring-wrapper flex items-center mb-4">
        <div
          className="step-ring relative w-20 h-20 rounded-full flex items-center justify-center bg-gray-100"
          style={{
            background: `conic-gradient(#22c55e ${percentage * 3.6}deg, #f3f4f6 0deg)`,
          }}
        >
          <div className="step-ring-center absolute w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold text-gray-700 shadow-sm">
            {percentage}%
          </div>
        </div>
        <div className="ml-4">
          <p className="text-sm">{todaySteps.toLocaleString()} / {target.toLocaleString()} steps</p>
          <input
            type="number"
            min="0"
            placeholder="Enter steps"
            value={inputSteps}
            onChange={(e) => setInputSteps(e.target.value)}
            className="step-input w-24 p-1 border rounded mr-2"
          />
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
      <div className="step-history">
        <h3 className="text-sm font-medium mb-2">Recent Days</h3>
        <ul className="space-y-1">
          {recent.map((log) => (
            <li key={log._id} className="text-xs">
              {log.date}: {log.steps.toLocaleString()} steps
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
