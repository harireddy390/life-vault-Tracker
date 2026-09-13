import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, Heart, Activity, ShieldAlert } from 'lucide-react';

const RELATIONSHIPS = [
  'Self',
  'Spouse / Partner',
  'Child / Dependent',
  'Parent',
  'Sibling',
  'Grandparent',
  'Relative / In-law',
  'Other'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'undisclosed', label: 'Prefer not to say' }
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
    relationship: 'Child / Dependent',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    phone_number: '',
    email: '',
    is_emergency_contact: false,
    allergies: '',
    chronic_conditions: '',
    notes: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || '',
        relationship: initialData.relationship || 'Child / Dependent',
        date_of_birth: initialData.date_of_birth ? new Date(initialData.date_of_birth).toISOString().split('T')[0] : '',
        gender: initialData.gender || '',
        blood_group: initialData.blood_group || '',
        phone_number: initialData.phone_number || '',
        email: initialData.email || '',
        is_emergency_contact: !!initialData.is_emergency_contact,
        allergies: Array.isArray(initialData.allergies) ? initialData.allergies.join(', ') : (initialData.allergies || ''),
        chronic_conditions: Array.isArray(initialData.chronic_conditions) ? initialData.chronic_conditions.join(', ') : (initialData.chronic_conditions || ''),
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        full_name: '',
        relationship: 'Child / Dependent',
        date_of_birth: '',
        gender: '',
        blood_group: '',
        phone_number: '',
        email: '',
        is_emergency_contact: false,
        allergies: '',
        chronic_conditions: '',
        notes: ''
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError('Please provide the full legal name.');
      return;
    }

    const allergiesArray = formData.allergies
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    const chronicArray = formData.chronic_conditions
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    const payload = {
      ...formData,
      allergies: allergiesArray,
      chronic_conditions: chronicArray
    };

    onSubmit(payload);
  };

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-xl flex flex-col max-h-[90vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Modal Header with normal light colors */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
              <UserPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialData ? 'Edit Family Member Profile' : 'Add Family Member'}
              </h3>
              <p className="text-xs text-slate-500">Personal credentials, health metrics, and emergency contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin bg-white">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Full Name & Relationship */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Relationship <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs capitalize"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 (555) 019-2834"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="sarah@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Emergency Contact Toggle */}
          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Primary Emergency Contact</span>
                <span className="text-[11px] text-slate-600">Designate as prioritized contact on emergency card</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_emergency_contact}
                onChange={(e) => setFormData({ ...formData, is_emergency_contact: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Allergies & Chronic Conditions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Known Allergies (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Peanuts, Penicillin, Bee stings"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-amber-500" /> Chronic Conditions (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Asthma, Type 1 Diabetes, Hypertension"
                value={formData.chronic_conditions}
                onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Personal Notes &amp; Directives</label>
            <textarea
              rows={2}
              placeholder="Special instructions, dietary habits, or physician recommendations..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-2xs"
            />
          </div>

          {/* Footer Action Buttons */}
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
              disabled={isSubmitting || !formData.full_name.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
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
