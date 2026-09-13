import React, { useState } from 'react';
import { X, CheckSquare, Star, Plus, Calendar } from 'lucide-react';
import { getISTDateStr } from '../../utils/istTime';

export default function QuickTaskModal({ isOpen, onClose, onSubmit, isSubmitting = false }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(getISTDateStr());
  const [important, setImportant] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    onSubmit({
      title: title.trim(),
      priority,
      dueDate: dueDate || null,
      important,
    });
  };

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-md flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
              <CheckSquare className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Priority Task</h3>
              <p className="text-xs text-slate-500">Persists directly to your Life Vault task system</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(''); }}
              placeholder="e.g. Complete DSA practice, Review lecture notes"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              autoFocus
              required
            />
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority Level</label>
            <div className="flex gap-2">
              {[
                { id: 'high', label: 'Must Do (High)', color: 'border-rose-300 bg-rose-50 text-rose-700' },
                { id: 'medium', label: 'Should Do (Med)', color: 'border-amber-300 bg-amber-50 text-amber-700' },
                { id: 'low', label: 'Quick Win (Low)', color: 'border-slate-300 bg-slate-50 text-slate-700' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    priority === p.id ? `${p.color} ring-2 ring-indigo-400 font-bold` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Important */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => setImportant(!important)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  important
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Star className={`w-4 h-4 ${important ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                <span>{important ? 'Star Marked' : 'Mark Star'}</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
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
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Adding...' : 'Add Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
