import { useState } from 'react';
import './CreateHabitModal.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CreateHabitModal({ defaultStartDate, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [important, setImportant] = useState(false);
  // Default to 'everyday' to match backend schema perfectly
  const [frequency, setFrequency] = useState('everyday'); 
  const [type, setType] = useState('binary'); // 'binary' or 'quantifiable'
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [category, setCategory] = useState('Personal');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  
  // Ensure we always have a valid date string
  const safeDefaultDate = defaultStartDate || new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(safeDefaultDate);
  const [endDate, setEndDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleDay = (d) => {
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };
const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!title.trim()) { 
      setError('Please add a title.'); 
      return; 
    }

    // Safety check: Prevent app crash if a page forgot to pass onCreate
    if (typeof onCreate !== 'function') {
      console.error("Developer Error: This modal is missing the 'onCreate' prop from its parent component!");
      setError("System error: Missing save function. Check console.");
      return;
    }

    let finalDays = [];
    if (frequency === 'everyday') finalDays = [0, 1, 2, 3, 4, 5, 6];
    else if (frequency === 'weekdays') finalDays = [1, 2, 3, 4, 5];
    else if (frequency === 'weekends') finalDays = [0, 6];
    else finalDays = daysOfWeek;

    if (finalDays.length === 0) { 
      setError('Please pick at least one day.'); 
      return; 
    }

    setSaving(true);
    try {
      await onCreate({
        title: title.trim(), 
        text: title.trim(), 
        description, 
        important, 
        frequency,
        type,
        targetValue: type === 'quantifiable' ? Number(targetValue) : null,
        targetUnit: type === 'quantifiable' ? targetUnit : null,
        category,
        daysOfWeek: finalDays, 
        startDate, 
        endDate: endDate || null,
        reminderTime: reminderTime || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not create task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="habit-modal-backdrop" onClick={onClose}>
      <div className="habit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="habit-modal-header">
          <p>New Task / Habit</p>
          <button className="habit-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <form className="habit-modal-form" onSubmit={handleSubmit}>
          {error && <div className="habit-modal-error text-red-600 bg-red-50 p-2 rounded mb-4 text-sm border border-red-200">{error}</div>}

          <input 
            className="input" 
            placeholder="Title (e.g. DSA Practice)" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            autoFocus
          />
          <textarea 
            className="input" 
            rows={2} 
            placeholder="Description (optional)" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
          />

          <label className="habit-important-toggle flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
            <span className="text-gray-700 font-medium">Mark as important {'\u2605'}</span>
          </label>

          <select className="input mt-4" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="everyday">Every day</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekends">Weekends</option>
            <option value="custom">Custom days</option>
          </select>

        {/* Habit Type Selector */}
        <div className="habit-form-row mt-4">
          <label className="habit-field-label text-xs font-semibold text-gray-500 uppercase tracking-wide">Habit Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="binary">Binary (checkbox)</option>
            <option value="quantifiable">Quantifiable</option>
          </select>
        </div>

        {type === 'quantifiable' && (
          <div className="habit-form-row mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="habit-field-label text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Value</label>
              <input className="input" type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g., 30" />
            </div>
            <div>
              <label className="habit-field-label text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Unit</label>
              <select className="input" value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)}>
                <option value="">Select unit</option>
                <option value="times">times</option>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="pages">pages</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>
        )}

        {/* Category Selector */}
        <div className="habit-form-row mt-4">
          <label className="habit-field-label text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Health">Health</option>
            <option value="Career">Career</option>
            <option value="Learning">Learning</option>
            <option value="Finance">Finance</option>
            <option value="Personal">Personal</option>
          </select>
        </div>

          {frequency === 'custom' && (
            <div className="habit-days-row mt-2">
              {DAY_LABELS.map((label, i) => (
                <button 
                  type="button" 
                  key={label} 
                  className={`habit-day-btn ${daysOfWeek.includes(i) ? 'habit-day-btn-active bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`} 
                  onClick={() => toggleDay(i)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="habit-form-row mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="habit-field-label text-xs font-semibold text-gray-500 uppercase tracking-wide">Start date</label>
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="habit-field-label text-xs font-semibold text-gray-500 uppercase tracking-wide">End date (optional)</label>
              <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <label className="habit-field-label text-xs font-semibold text-gray-500 uppercase tracking-wide">Reminder time (optional)</label>
            <input className="input" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          </div>

          <button className="btn btn-primary full-width mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-colors" type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}