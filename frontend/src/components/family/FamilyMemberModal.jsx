import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, ShieldAlert, Heart, Activity } from 'lucide-react';

const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Guardian', 'Self', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Non_Binary', label: 'Non-Binary' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer_Not_To_Say', label: 'Prefer not to say' }
];

export default function FamilyMemberModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false
}) {
  const [formData, setFormData] = useState({
    full_name: '',
    relationship: 'Other',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    is_emergency_contact: false,
    phone_number: '',
    email: '',
    allergies: '',
    chronic_conditions: '',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || '',
        relationship: initialData.relationship || 'Other',
        date_of_birth: initialData.date_of_birth ? initialData.date_of_birth.substring(0, 10) : '',
        gender: initialData.gender || '',
        blood_group: initialData.blood_group || '',
        is_emergency_contact: Boolean(initialData.is_emergency_contact),
        phone_number: initialData.phone_number || '',
        email: initialData.email || '',
        allergies: Array.isArray(initialData.allergies) ? initialData.allergies.join(', ') : '',
        chronic_conditions: Array.isArray(initialData.chronic_conditions) ? initialData.chronic_conditions.join(', ') : '',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        full_name: '',
        relationship: 'Other',
        date_of_birth: '',
        gender: '',
        blood_group: '',
        is_emergency_contact: false,
        phone_number: '',
        email: '',
        allergies: '',
        chronic_conditions: '',
        notes: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;

    // Split allergies and chronic conditions by comma
    const allergiesArray = formData.allergies
      ? formData.allergies.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const chronicArray = formData.chronic_conditions
      ? formData.chronic_conditions.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      ...formData,
      allergies: allergiesArray,
      chronic_conditions: chronicArray
    };

    onSubmit(payload);
  };

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {initialData ? 'Edit Family Member Profile' : 'Add Family Member'}
              </h3>
              <p className="text-[11px] text-slate-400">Personal credentials, health metrics, and emergency contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
          {/* Full Name & Relationship */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Relationship <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DOB, Gender & Blood Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent capitalize"
              >
                <option value="">Select Gender</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 (555) 019-2834"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="sarah@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Emergency Contact Toggle */}
          <div className="p-3 bg-[#1e293b]/70 border border-slate-700/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Primary Emergency Contact</span>
                <span className="text-[10px] text-slate-400">Designate as prioritized contact on emergency card</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_emergency_contact}
                onChange={(e) => setFormData({ ...formData, is_emergency_contact: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Allergies & Chronic Conditions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-400" /> Known Allergies (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Peanuts, Penicillin, Bee stings"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" /> Chronic Conditions (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Asthma, Type 1 Diabetes, Hypertension"
                value={formData.chronic_conditions}
                onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Personal Notes & Directives</label>
            <textarea
              rows={2}
              placeholder="Special instructions, dietary habits, or physician recommendations..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-[#1e293b] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Footer Action Buttons */}
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
              disabled={isSubmitting || !formData.full_name.trim()}
              className="btn-cobalt"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : initialData ? 'Update Profile' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
