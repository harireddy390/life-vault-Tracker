import React, { useState } from 'react';
import { Pill, Plus, Check, AlertCircle, Trash2, Clock, User, ShieldAlert } from 'lucide-react';
import { takeDose } from '../../services/healthService';

export default function MedicationsPanel({
  medications,
  onOpenAddModal,
  onDeleteClick,
  onMedicationUpdated,
}) {
  const [takingId, setTakingId] = useState(null);

  const handleTakeDose = async (id) => {
    setTakingId(id);
    try {
      await takeDose(id);
      onMedicationUpdated();
    } catch (err) {
      console.error('Failed to take dose:', err);
    } finally {
      setTakingId(null);
    }
  };

  const getStatusBadge = (status, pillsRemaining) => {
    switch (status) {
      case 'DEPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
            <ShieldAlert className="w-3 h-3" /> DEPLETED (0 pills)
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircle className="w-3 h-3" /> REFILL LOW ({pillsRemaining} left)
          </span>
        );
      case 'OK':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Check className="w-3 h-3" /> OK ({pillsRemaining} left)
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-indigo-600" />
            Active Prescriptions & Regimens
          </h3>
          <p className="text-xs text-slate-500">
            Track daily dosages, administration schedules, and automatic refill alerts
          </p>
        </div>

        {/* Vault Popout Button */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-indigo-500/60 text-slate-100 rounded-xl text-xs font-semibold shadow-lg shadow-slate-950/40 hover:brightness-110 hover:ring-2 hover:ring-indigo-500/40 hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 cursor-pointer self-start sm:self-auto"
        >
          <span className="w-5 h-5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 transition-all">
            <Plus className="w-3.5 h-3.5" />
          </span>
          <span>Add Medication</span>
        </button>
      </div>

      {medications && medications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((med) => (
            <div
              key={med._id}
              className="h-card p-5 flex flex-col justify-between space-y-3 relative group transition-all duration-200 hover:border-indigo-300"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{med.name}</h4>
                      <span className="text-xs text-indigo-600 font-mono font-semibold">{med.dosage}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteClick(med)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="Remove Prescription"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{med.frequency}</span>
                  </div>

                  {med.prescribedBy && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{med.prescribedBy}</span>
                    </div>
                  )}

                  {med.instructions && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-2">
                      "{med.instructions}"
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>{getStatusBadge(med.refillStatus, med.pillsRemaining)}</div>

                <button
                  onClick={() => handleTakeDose(med._id)}
                  disabled={med.pillsRemaining <= 0 || takingId === med._id}
                  className="vault-btn-ghost text-xs py-1.5 px-3 text-indigo-600 hover:text-indigo-800 border-indigo-200 hover:bg-indigo-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Check className="w-3 h-3 text-indigo-600" />
                  {takingId === med._id ? 'Logging...' : 'Log Taken'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-card p-8 text-center space-y-3 border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">No Prescriptions Tracked</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Add your active medications to monitor remaining pills and receive refill alerts
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="vault-btn-primary mx-auto mt-2"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Add First Medication</span>
          </button>
        </div>
      )}
    </div>
  );
}
