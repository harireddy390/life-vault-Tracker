import React, { useState, useEffect } from 'react';
import { X, Pill, AlertCircle } from 'lucide-react';
import { addMedication } from '../../../services/healthService';

const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'Every 12 hours',
  'As needed',
  'Weekly',
  'Other',
];

export default function AddMedicationModal({ isOpen, onClose, onMedicationAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    prescribedBy: '',
    pillsRemaining: 30,
    refillThreshold: 7,
    instructions: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFormData({
        name: '',
        dosage: '',
        frequency: 'Once daily',
        prescribedBy: '',
        pillsRemaining: 30,
        refillThreshold: 7,
        instructions: '',
      });
      setError('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.dosage.trim()) {
      setError('Medication name and dosage are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await addMedication({
        ...formData,
        pillsRemaining: Number(formData.pillsRemaining) || 0,
        refillThreshold: Number(formData.refillThreshold) || 7,
      });
      onMedicationAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add medication.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-modal-backdrop" onClick={onClose}>
      <div className="h-modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="h-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">Add Prescription Medication</h3>
              <p className="text-xs text-slate-400 mt-0.5">Track remaining pill inventory and schedule refill reminders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="h-modal-body space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
                Medication Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                className="h-input"
                placeholder="e.g. Lisinopril, Metformin"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
                Dosage & Strength <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                className="h-input font-mono"
                placeholder="e.g. 10mg, 500mg, 1 puff"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Frequency Interval
              </label>
              <select
                className="h-input cursor-pointer"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Prescribing Physician
              </label>
              <input
                type="text"
                className="h-input"
                placeholder="e.g. Dr. Emily Chen, Cardiologist"
                value={formData.prescribedBy}
                onChange={(e) => setFormData({ ...formData, prescribedBy: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Current Pill Count
              </label>
              <input
                type="number"
                min="0"
                className="h-input font-mono font-bold"
                value={formData.pillsRemaining}
                onChange={(e) => setFormData({ ...formData, pillsRemaining: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Refill Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                className="h-input font-mono font-bold"
                value={formData.refillThreshold}
                onChange={(e) => setFormData({ ...formData, refillThreshold: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Special Administration Instructions
            </label>
            <textarea
              rows={2}
              className="h-input resize-none"
              placeholder="e.g. Take with food in the morning, do not crush..."
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            />
          </div>

          {/* Footer */}
          <div className="h-modal-footer -mx-6 -mb-6 mt-6">
            <button type="button" onClick={onClose} className="vault-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="vault-btn-action">
              {saving ? 'Saving...' : 'Add to Regimen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
