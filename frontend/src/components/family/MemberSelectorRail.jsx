import React from 'react';
import { Plus, ShieldAlert } from 'lucide-react';

const RELATION_COLORS = {
  Spouse: 'bg-rose-50 text-rose-700 border-rose-200',
  Child: 'bg-sky-50 text-sky-700 border-sky-200',
  Parent: 'bg-amber-50 text-amber-700 border-amber-200',
  Sibling: 'bg-purple-50 text-purple-700 border-purple-200',
  Guardian: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Self: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Other: 'bg-slate-100 text-slate-700 border-slate-200'
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
  'linear-gradient(135deg, #e11d48 0%, #db2777 100%)',
  'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)'
];

export default function MemberSelectorRail({ members, selectedMemberId, onSelectMember, onOpenAddMember }) {
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="member-selector-section mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Family Profiles</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {members.length} {members.length === 1 ? 'Person' : 'People'}
          </span>
        </div>
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
        {members.map((member, index) => {
          const isSelected = member._id === selectedMemberId;
          const avatarGradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
          const relClass = RELATION_COLORS[member.relationship] || RELATION_COLORS.Other;

          return (
            <div
              key={member._id}
              onClick={() => onSelectMember(member._id)}
              className={`flex-shrink-0 w-56 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none relative group ${
                isSelected
                  ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20 -translate-y-0.5'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5'
              }`}
            >
              {/* Emergency indicator */}
              {member.is_emergency_contact && (
                <div
                  title="Primary Emergency Contact"
                  className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold"
                >
                  <ShieldAlert className="w-3 h-3 text-rose-500 animate-pulse" />
                  <span>SOS</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div
                  style={{ background: avatarGradient }}
                  className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0"
                >
                  {getInitials(member.full_name)}
                </div>
                <div className="min-w-0 flex-1 pr-7">
                  <h3 className="text-xs font-bold text-slate-900 truncate leading-snug" title={member.full_name}>
                    {member.full_name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${relClass}`}>
                      {member.relationship}
                    </span>
                    {member.blood_group && member.blood_group !== 'Unknown' && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {member.blood_group}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Age and quick info footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {member.age !== null && member.age !== undefined ? `${member.age} yrs old` : (member.gender || 'Profile')}
                </span>
                <span className={`font-semibold transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                  {isSelected ? 'Active •' : 'Select →'}
                </span>
              </div>
            </div>
          );
        })}

        {/* Add Card at the end */}
        <div
          onClick={onOpenAddMember}
          className="flex-shrink-0 w-44 p-3.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center group"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1.5 transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">
            Add Member
          </span>
          <span className="text-[10px] text-slate-400">New profile</span>
        </div>
      </div>
    </div>
  );
}
