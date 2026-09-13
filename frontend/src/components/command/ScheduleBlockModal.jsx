import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Save, Trash2, Tag, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { id: 'routine', label: 'Routine / Habit', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'college', label: 'College / Lecture', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'gym', label: 'Gym / Workout', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'study', label: 'Study / Coding', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'work', label: 'Work / Project', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'personal', label: 'Personal / Buffer', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'rest', label: 'Rest / Sleep', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'other', label: 'Other', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

const DAYS = [
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
  { index: 6, label: 'Sat' },
  { index: 0, label: 'Sun' },
];

export default function ScheduleBlockModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData = null,
  isSubmitting = false,
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'routine',
    priority: 'medium',
    daysOfWeek: [1, 2, 3, 4, 5],
    isRecurring: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        startTime: initialData.startTime || '09:00',
        endTime: initialData.endTime || '10:00',
        category: initialData.category || 'routine',
        priority: initialData.priority || 'medium',
        daysOfWeek: initialData.daysOfWeek || [1, 2, 3, 4, 5],
        isRecurring: initialData.isRecurring !== undefined ? initialData.isRecurring : true,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        startTime: '19:45',
        endTime: '21:30',
        category: 'study',
        priority: 'high',
        daysOfWeek: [1, 2, 3, 4, 5],
        isRecurring: true,
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (dayIndex) => {
    const current = formData.daysOfWeek;
    if (current.includes(dayIndex)) {
      if (current.length === 1) return; // Keep at least one
      setFormData({ ...formData, daysOfWeek: current.filter((d) => d !== dayIndex) });
    } else {
      setFormData({ ...formData, daysOfWeek: [...current, dayIndex] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please provide a title for this block');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('Start time and end time are required');
      return;
    }
    if (formData.isRecurring && formData.daysOfWeek.length === 0) {
      setError('Please select at least one active day');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-lg flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialData ? 'Edit Schedule Block' : 'Add Schedule Block'}
              </h3>
              <p className="text-xs text-slate-500">24-hour time intervals anchored to Indian Standard Time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin bg-white">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Block Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Deep Study, Gym, Commute, College"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Time Range in 24h format */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Time (HH:mm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Time (HH:mm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    formData.category === cat.id
                      ? `${cat.color} font-bold ring-2 ring-indigo-400`
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring Toggle & Days Selector */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Recurring Routine</span>
                <p className="text-[11px] text-slate-500">Repeats automatically every selected week day</p>
              </div>
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            {formData.isRecurring && (
              <div>
                <span className="text-[11px] font-bold text-slate-600 block mb-1.5">Repeat on Days:</span>
                <div className="flex gap-1">
                  {DAYS.map((d) => {
                    const active = formData.daysOfWeek.includes(d.index);
                    return (
                      <button
                        key={d.index}
                        type="button"
                        onClick={() => toggleDay(d.index)}
                        className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setFormData({ ...formData, priority: p })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase border transition-colors ${
                    formData.priority === p
                      ? p === 'high'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : p === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-slate-100 text-slate-800 border-slate-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional notes or details for this block"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(initialData._id)}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Block</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Block'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
