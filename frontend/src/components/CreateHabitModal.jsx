import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Sparkles, RefreshCw } from 'lucide-react';
import './CreateHabitModal.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CreateHabitModal({
  defaultStartDate,
  initialData = null,
  onClose,
  onCreate,
  onUpdate,
}) {
  const isEdit = Boolean(initialData && initialData._id);

  const [title, setTitle] = useState(initialData?.title || initialData?.text || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [important, setImportant] = useState(Boolean(initialData?.important));
  const [frequency, setFrequency] = useState(initialData?.frequency || 'everyday');
  const [type, setType] = useState(initialData?.type || 'binary');
  const [targetValue, setTargetValue] = useState(
    initialData?.targetValue !== undefined && initialData?.targetValue !== null
      ? String(initialData.targetValue)
      : ''
  );
  const [targetUnit, setTargetUnit] = useState(initialData?.targetUnit || '');
  const [category, setCategory] = useState(initialData?.category || 'Personal');
  const [daysOfWeek, setDaysOfWeek] = useState(
    Array.isArray(initialData?.daysOfWeek) ? initialData.daysOfWeek : []
  );

  const safeDefaultDate =
    initialData?.startDate ||
    defaultStartDate ||
    new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(safeDefaultDate);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [reminderTime, setReminderTime] = useState(initialData?.reminderTime || '');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || initialData.text || '');
      setDescription(initialData.description || '');
      setImportant(Boolean(initialData.important));
      setFrequency(initialData.frequency || 'everyday');
      setType(initialData.type || 'binary');
      setTargetValue(
        initialData.targetValue !== undefined && initialData.targetValue !== null
          ? String(initialData.targetValue)
          : ''
      );
      setTargetUnit(initialData.targetUnit || '');
      setCategory(initialData.category || 'Personal');
      setDaysOfWeek(Array.isArray(initialData.daysOfWeek) ? initialData.daysOfWeek : []);
      setStartDate(initialData.startDate || safeDefaultDate);
      setEndDate(initialData.endDate || '');
      setReminderTime(initialData.reminderTime || '');
    }
  }, [initialData, safeDefaultDate]);

  const toggleDay = (d) => {
    setDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please add a task title.');
      return;
    }

    if (!startDate) {
      setError('Please specify a start date.');
      return;
    }

    let finalDays = [];
    if (frequency === 'everyday' || frequency === 'daily') finalDays = [0, 1, 2, 3, 4, 5, 6];
    else if (frequency === 'weekdays') finalDays = [1, 2, 3, 4, 5];
    else if (frequency === 'weekends') finalDays = [0, 6];
    else finalDays = daysOfWeek;

    if (frequency === 'custom' && finalDays.length === 0) {
      setError('Please pick at least one day for custom frequency.');
      return;
    }

    if (type === 'quantifiable') {
      if (!targetValue || isNaN(Number(targetValue)) || Number(targetValue) <= 0) {
        setError('Please specify a valid numeric target value (greater than 0).');
        return;
      }
      if (!targetUnit) {
        setError('Please select a target unit for quantifiable tasks.');
        return;
      }
    }

    const payload = {
      title: title.trim(),
      text: title.trim(),
      description: description.trim(),
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
    };

    setSaving(true);
    try {
      if (isEdit) {
        if (typeof onUpdate === 'function') {
          await onUpdate(initialData._id, payload);
        } else if (typeof onCreate === 'function') {
          await onCreate(payload);
        }
      } else {
        if (typeof onCreate === 'function') {
          await onCreate(payload);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || (isEdit ? 'Could not update task.' : 'Could not create task.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      style={{ boxSizing: 'border-box' }}
    >
      <div
        className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-900 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        style={{ boxSizing: 'border-box', maxWidth: '100%' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {isEdit ? 'Edit Habit / Task' : 'New Habit / Task'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? 'Update details, frequency and targets' : 'Schedule a recurring routine or daily task'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form className="overflow-y-auto py-4 space-y-4 pr-1" onSubmit={handleSubmit} style={{ boxSizing: 'border-box' }}>
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              placeholder="e.g., Deep Work, 5km Run, DSA Practice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
              rows={2}
              placeholder="Context or notes about this habit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Important & Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Life Domain / Category
              </label>
              <select
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Health">Health</option>
                <option value="Career">Career</option>
                <option value="Learning">Learning</option>
                <option value="Finance">Finance</option>
                <option value="Personal">Personal</option>
              </select>
            </div>

            <div className="pt-2 sm:pt-5">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={important}
                  onChange={(e) => setImportant(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  ⭐ Mark as High Priority
                </span>
              </label>
            </div>
          </div>

          {/* Frequency & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Frequency
              </label>
              <select
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="everyday">Every day</option>
                <option value="weekdays">Weekdays (Mon-Fri)</option>
                <option value="weekends">Weekends (Sat-Sun)</option>
                <option value="custom">Custom Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Habit Type
              </label>
              <select
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="binary">Binary (Done / Undone)</option>
                <option value="quantifiable">Quantifiable (Target Value)</option>
              </select>
            </div>
          </div>

          {/* Quantifiable Targets */}
          {type === 'quantifiable' && (
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                  Target Value <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="e.g., 30"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                  Target Unit <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                >
                  <option value="">Select unit...</option>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="pages">pages</option>
                  <option value="times">times</option>
                  <option value="%">%</option>
                </select>
              </div>
            </div>
          )}

          {/* Custom Days Picker */}
          {frequency === 'custom' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Active Days
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAY_LABELS.map((label, i) => {
                  const active = daysOfWeek.includes(i);
                  return (
                    <button
                      type="button"
                      key={label}
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dates & Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                End Date (Opt)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reminder Time
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}