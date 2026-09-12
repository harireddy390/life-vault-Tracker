import React, { useState } from 'react';
import { 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  ShieldAlert, 
  Activity, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  HeartHandshake,
  Droplets
} from 'lucide-react';

export default function MemberDossierCard({ 
  member, 
  onEditMember, 
  onDeleteMember 
}) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!member) {
    return (
      <div className="fam-card p-6 text-center text-slate-500 mb-6">
        <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-700">No Member Selected</h3>
        <p className="text-xs text-slate-400 mt-1">Select a family member profile above to inspect medical and personal records.</p>
      </div>
    );
  }

  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const formattedDob = member.date_of_birth
    ? new Date(member.date_of_birth).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <div className="fam-card overflow-hidden mb-6">
      {/* Top Banner */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-indigo-100">
            {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'F'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">{member.full_name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {member.relationship}
              </span>
              {member.is_emergency_contact && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  Primary SOS Contact
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
              {member.gender && <span className="capitalize">{member.gender.replace(/_/g, ' ')}</span>}
              {member.age !== null && member.age !== undefined && (
                <>
                  <span>•</span>
                  <span>{member.age} Yrs</span>
                </>
              )}
              {formattedDob && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Born {formattedDob}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditMember(member)}
            className="vault-btn-ghost text-xs py-1 px-2.5"
            title="Edit Profile"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDeleteMember(member)}
            className="vault-btn-ghost text-xs py-1 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            title="Delete Profile"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid: Contact & Clinical Highlights */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact credentials card */}
        <div className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/70">
          <div className="flex items-center gap-2 mb-2.5">
            <Phone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Contact Directives</span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Phone Number</span>
              {member.phone_number ? (
                <div className="flex items-center justify-between">
                  <a
                    href={`tel:${member.phone_number}`}
                    className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {member.phone_number}
                  </a>
                  <button
                    onClick={() => handleCopy(member.phone_number, 'phone')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Copy Phone"
                  >
                    {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No phone recorded</span>
              )}
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Email Address</span>
              {member.email ? (
                <div className="flex items-center justify-between">
                  <a
                    href={`mailto:${member.email}`}
                    className="text-xs font-semibold text-indigo-600 hover:underline truncate max-w-[180px] inline-flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    {member.email}
                  </a>
                  <button
                    onClick={() => handleCopy(member.email, 'email')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Copy Email"
                  >
                    {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No email recorded</span>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Snapshot card */}
        <div className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/70">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Clinical Snapshot</span>
            </div>
            {member.blood_group && member.blood_group !== 'Unknown' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                <Droplets className="w-3 h-3 fill-rose-600 text-rose-600" />
                {member.blood_group}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {/* Allergies */}
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-500" /> Known Allergies
              </span>
              {member.allergies && member.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {member.allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No known allergies</span>
              )}
            </div>

            {/* Chronic Conditions */}
            <div>
              <span className="text-[10px] text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                <HeartHandshake className="w-3 h-3 text-amber-600" /> Chronic Conditions
              </span>
              {member.chronic_conditions && member.chronic_conditions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {member.chronic_conditions.map((cond, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">No conditions recorded</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Directives / Notes footer if present */}
      {member.notes && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 text-[11px] text-slate-600 flex items-start gap-2">
          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed"><strong className="text-slate-800">Physician & Care Notes: </strong>{member.notes}</p>
        </div>
      )}
    </div>
  );
}
