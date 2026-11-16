import React, { useState } from 'react';
import { Pill, Check, Clock, Plus, Flame, AlertCircle } from 'lucide-react';

export default function MedicationScheduleTracker({
  date,
  meds = [],
  onToggleMed,
  onOpenAddMed,
}) {
  const [loadingMap, setLoadingMap] = useState({});

  const handleToggle = async (item, idx) => {
    setLoadingMap((prev) => ({ ...prev, [idx]: true }));
    try {
      await onToggleMed({
        medId: item.medId || item._id,
        name: item.name,
        dosage: item.dosage,
        scheduledTime: item.scheduledTime,
        taken: !item.taken,
      });
    } finally {
      setLoadingMap((prev) => ({ ...prev, [idx]: false }));
    }
  };

  const takenCount = meds.filter((m) => m.taken).length;
  const progressPct = meds.length > 0 ? Math.round((takenCount / meds.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Medications & Supplements</h3>
            <p className="text-xs text-slate-500">
              {takenCount} of {meds.length} taken today ({progressPct}%)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddMed}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200/60 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Prescription
        </button>
      </div>

      {/* Progress Bar */}
      {meds.length > 0 && (
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Medication List */}
      {meds.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-sm space-y-2">
          <Pill className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
          <p className="font-medium text-slate-700">No active medications scheduled for {date}</p>
          <p className="text-xs text-slate-400">Add daily vitamins, supplements, or prescriptions to track adherence.</p>
          <button
            type="button"
            onClick={onOpenAddMed}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-purple-600 hover:bg-slate-50 shadow-xs"
          >
            <Plus className="w-3 h-3" />
            Add First Medication
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {meds.map((item, idx) => {
            const isTaken = !!item.taken;
            const isLoading = !!loadingMap[idx];

            return (
              <div
                key={item._id || item.medId || idx}
                className="py-3 flex items-center justify-between gap-3 group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(item, idx)}
                    disabled={isLoading}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                      isTaken
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                        : 'border-slate-300 hover:border-purple-500 text-transparent'
                    }`}
                  >
                    <Check className={`w-4 h-4 stroke-[3] ${isTaken ? 'block' : 'opacity-0'}`} />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isTaken ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {item.name}
                      </p>
                      {item.streak > 1 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {item.streak}d streak
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{item.dosage || 'Standard dose'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.scheduledTime || 'Daily'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      isTaken
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isTaken ? 'Taken' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
