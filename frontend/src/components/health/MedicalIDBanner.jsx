import React from 'react';
import {
  ShieldCheck,
  Phone,
  AlertCircle,
  Edit3,
  HeartPulse,
  Stethoscope,
  UserCheck,
  Shield,
} from 'lucide-react';

export default function MedicalIDBanner({ profile, contacts, onOpenEdit }) {
  const bloodType = profile?.bloodType || 'Unknown';
  const allergies = profile?.criticalAllergies || [];
  const conditions = profile?.chronicConditions || [];
  const devices = profile?.implantedDevices;
  const isOrganDonor = profile?.organDonor;
  const notes = profile?.specialNotes;

  return (
    <div className="h-card relative overflow-hidden p-5 sm:p-6 bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
      {/* Background glow badge */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        {/* Left Side: Medical Identity */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Emergency Medical ID
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    First Responder Triage
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Critical blood group, verified allergies, chronic conditions, and emergency responder routing
                </p>
              </div>
            </div>

            {/* Mobile edit trigger */}
            <button
              onClick={onOpenEdit}
              className="md:hidden vault-btn-ghost text-xs py-1.5 px-3"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>

          {/* Blood Type & Donor Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl shadow-xs">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-semibold text-rose-800">Blood Group:</span>
              <span className="text-sm font-extrabold text-slate-900 font-mono">{bloodType}</span>
            </div>

            {isOrganDonor && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-xs">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">Registered Organ Donor</span>
              </div>
            )}

            {devices && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl shadow-xs">
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-indigo-900">
                  <strong className="text-indigo-700">Devices:</strong> {devices}
                </span>
              </div>
            )}
          </div>

          {/* Allergies & Conditions Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Critical Allergies
              </span>
              {allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No critical allergies recorded.</span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5 text-amber-500" /> Chronic Conditions
              </span>
              {conditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((cond, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No chronic conditions recorded.</span>
              )}
            </div>
          </div>

          {notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Responders Note: </span>
              {notes}
            </div>
          )}
        </div>

        {/* Right Side: Emergency Contacts Box */}
        <div className="w-full md:w-80 bg-slate-50/80 rounded-2xl border border-slate-200 p-4.5 flex flex-col justify-between shrink-0 shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" /> Emergency Contacts
              </span>
              <button
                onClick={onOpenEdit}
                className="hidden md:flex text-xs text-indigo-600 hover:text-indigo-800 items-center gap-1 transition-colors font-semibold"
              >
                <Edit3 className="w-3 h-3" /> Edit Profile
              </button>
            </div>

            {contacts && contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.slice(0, 3).map((contact) => (
                  <div
                    key={contact._id}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{contact.name}</span>
                        {contact.isPrimary && (
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{contact.relationship}</span>
                    </div>

                    <a
                      href={`tel:${contact.phone}`}
                      className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 transition-all shadow-xs"
                      title={`Call ${contact.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-400 italic mb-2">No emergency contacts set.</p>
                <button
                  onClick={onOpenEdit}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  + Add primary responder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
