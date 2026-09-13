import React, { useState, useEffect } from 'react';
import { X, CalendarClock, Save, Sparkles } from 'lucide-react';

const QUICK_TEMPLATES = [
  'Passport Expiration',
  'Pediatric Vaccination',
  'Annual Health Checkup',
  'Health Insurance Renewal',
  'Vision / Dental Exam'
];

export default function FamilyRenewalModal({
  isOpen,
  onClose,
  onSubmit,
  members = [],
  selectedMemberId = '',
  isSubmitting = false
}) {
  const [formData, setFormData] = useState({
    title: '',
    family_member: selectedMemberId,
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        family_member: selectedMemberId || (members[0]?._id || ''),
        due_date: '',
        notes: ''
      });
    }
  }, [isOpen, selectedMemberId, members]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date || !formData.family_member) return;
    onSubmit(formData);
  };

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-md flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-2xs">
              <CalendarClock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Milestone / Renewal</h3>
              <p className="text-xs text-slate-500">Track deadlines, vaccinations, and document expirations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin bg-white">
          {/* Family Member Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Family Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.family_member}
              onChange={(e) => setFormData({ ...formData, family_member: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.full_name} ({m.relationship})
                </option>
              ))}
            </select>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[11px] text-slate-500 block mb-1.5 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Templates
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tmpl) => (
                <button
                  type="button"
                  key={tmpl}
                  onClick={() => setFormData({ ...formData, title: tmpl })}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 transition-colors"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          {/* Milestone Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Milestone / Renewal Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Passport Expiry, MMR Booster Shot"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target / Expiration Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              placeholder="Doctor clinic name, policy renewal link, documents needed..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-2xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.due_date}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Set Milestone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
