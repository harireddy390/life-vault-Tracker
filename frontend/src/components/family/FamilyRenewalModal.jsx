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
      <div className="frosted-modal-container max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Add Milestone / Renewal</h3>
              <p className="text-[11px] text-slate-400">Track deadlines, vaccinations, and document expirations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Family Member Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Family Member <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.family_member}
              onChange={(e) => setFormData({ ...formData, family_member: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
            <span className="text-[11px] text-slate-400 block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Quick Templates
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((tmpl) => (
                <button
                  type="button"
                  key={tmpl}
                  onClick={() => setFormData({ ...formData, title: tmpl })}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#1e293b] hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700 transition-colors"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          {/* Milestone Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Milestone / Renewal Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Passport Expiry, MMR Booster Shot"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target / Expiration Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              placeholder="Doctor clinic name, policy renewal link, documents needed..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.due_date}
              className="btn-cobalt"
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
