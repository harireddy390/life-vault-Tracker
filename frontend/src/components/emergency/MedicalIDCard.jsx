import React, { useState } from 'react';
import { ShieldCheck, Heart, AlertOctagon, Pill, FileHeart, Edit3, Check, X, ShieldAlert } from 'lucide-react';

export default function MedicalIDCard({ profile = {}, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: profile.bloodGroup || '',
    allergies: profile.allergies || '',
    chronicConditions: profile.chronicConditions || '',
    currentMedications: profile.currentMedications || '',
    organDonor: profile.organDonor ?? true,
    insuranceProvider: profile.insuranceProvider || '',
    insurancePolicyNumber: profile.insurancePolicyNumber || '',
    hospitalPreference: profile.hospitalPreference || '',
    medicalNotes: profile.medicalNotes || '',
  });

  const [saving, setSaving] = useState(false);

  // Keep form in sync when prop updates
  React.useEffect(() => {
    setForm({
      bloodGroup: profile.bloodGroup || '',
      allergies: profile.allergies || '',
      chronicConditions: profile.chronicConditions || '',
      currentMedications: profile.currentMedications || '',
      organDonor: profile.organDonor ?? true,
      insuranceProvider: profile.insuranceProvider || '',
      insurancePolicyNumber: profile.insurancePolicyNumber || '',
      hospitalPreference: profile.hospitalPreference || '',
      medicalNotes: profile.medicalNotes || '',
    });
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile(form);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-rose-400 border border-white/10">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight">Emergency Medical ID</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                Paramedic First Responder View
              </span>
            </div>
            <p className="text-xs text-slate-300">Crucial telemetry for doctors, first responders, and emergency triage</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/10"
        >
          <Edit3 className="w-3.5 h-3.5" />
          {isEditing ? 'Cancel' : 'Edit Medical ID'}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Blood Group (e.g. O+ve, A-ve)</label>
              <input
                type="text"
                placeholder="e.g. O+ POSITIVE"
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Organ Donor Status</label>
              <select
                value={form.organDonor ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, organDonor: e.target.value === 'yes' })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="yes">Yes, Registered Organ Donor</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-rose-700 block mb-1">Severe Allergies (Critical)</label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Peanuts, Latex, Contrast Dye"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Chronic Conditions</label>
              <input
                type="text"
                placeholder="e.g. Asthma, Hypertension, Type 1 Diabetes"
                value={form.chronicConditions}
                onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Current Active Medications</label>
              <input
                type="text"
                placeholder="e.g. Albuterol inhaler PRN, Metformin 500mg"
                value={form.currentMedications}
                onChange={(e) => setForm({ ...form, currentMedications: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Health Insurance Provider</label>
              <input
                type="text"
                placeholder="e.g. Blue Cross Blue Shield / Star Health"
                value={form.insuranceProvider}
                onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Insurance Policy Number</label>
              <input
                type="text"
                placeholder="e.g. POL-98472918"
                value={form.insurancePolicyNumber}
                onChange={(e) => setForm({ ...form, insurancePolicyNumber: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Preferred Hospital / Trauma Center</label>
              <input
                type="text"
                placeholder="e.g. City General Hospital, Emergency Trauma Wing"
                value={form.hospitalPreference}
                onChange={(e) => setForm({ ...form, hospitalPreference: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Special Medical Directives & Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Carries EpiPen in backpack front pocket. Contact spouse immediately before administering sedation."
                value={form.medicalNotes}
                onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              {saving ? 'Saving...' : 'Save Medical ID'}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 divide-y divide-slate-100 space-y-4">
          {/* Top Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4">
            {/* Blood Group */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block mb-0.5">
                Blood Group
              </span>
              <span className="text-2xl font-black text-rose-950 block">
                {profile.bloodGroup || 'UNKNOWN'}
              </span>
            </div>

            {/* Organ Donor */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">
                Organ Donor
              </span>
              <span className="text-lg font-black text-emerald-950 block">
                {profile.organDonor ? 'YES' : 'NO'}
              </span>
            </div>

            {/* Insurance Provider */}
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-center col-span-2 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-0.5">
                Insurance Policy
              </span>
              <span className="text-sm font-bold text-indigo-950 block truncate">
                {profile.insuranceProvider || 'Private Insurance'}
              </span>
              <span className="text-xs font-mono text-indigo-700 block">
                {profile.insurancePolicyNumber || 'Policy on file in Vault'}
              </span>
            </div>
          </div>

          {/* Critical Allergies Badge */}
          <div className="pt-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertOctagon className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-700 block">
                Severe Allergies & Adverse Reactions
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {profile.allergies || 'No known drug or food allergies recorded.'}
              </p>
            </div>
          </div>

          {/* Chronic Conditions & Meds */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <FileHeart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Chronic Medical Conditions
                </span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {profile.chronicConditions || 'None reported'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Current Medications
                </span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {profile.currentMedications || 'None reported'}
                </p>
              </div>
            </div>
          </div>

          {/* Special Directives & Notes */}
          {profile.medicalNotes && (
            <div className="pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Emergency Instructions & Directives
              </span>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                "{profile.medicalNotes}"
              </p>
            </div>
          )}

          {profile.hospitalPreference && (
            <div className="pt-4 flex items-center gap-2 text-xs text-slate-600">
              <span className="font-bold">Preferred Hospital:</span>
              <span>{profile.hospitalPreference}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
