import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Activity,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  ChevronRight,
  Heart,
  Droplets,
  Wind,
} from 'lucide-react';
import { logVital } from '../../../services/healthService';

const METRIC_CONFIG = {
  blood_pressure: {
    label: 'Blood Pressure',
    unit: 'mmHg',
    icon: Activity,
    hasSecondary: true,
    primaryLabel: 'Systolic (Top number)',
    secondaryLabel: 'Diastolic (Bottom number)',
    primaryPlaceholder: 'e.g. 118',
    secondaryPlaceholder: 'e.g. 78',
    adultTarget: 'Healthy Adult Target: < 120 / < 80 mmHg',
  },
  heart_rate: {
    label: 'Heart Rate (Pulse)',
    unit: 'bpm',
    icon: Heart,
    hasSecondary: false,
    primaryLabel: 'Resting Pulse (bpm)',
    primaryPlaceholder: 'e.g. 72',
    adultTarget: 'Healthy Adult Target: 60 – 100 bpm (Athletes: 40–60 bpm)',
  },
  glucose: {
    label: 'Blood Glucose',
    unit: 'mg/dL',
    icon: Droplets,
    hasSecondary: false,
    primaryLabel: 'Blood Sugar (mg/dL)',
    primaryPlaceholder: 'e.g. 92',
    adultTarget: 'Healthy Adult Target: 70 – 99 mg/dL (Fasting) or < 140 mg/dL (Post-meal)',
  },
  spo2: {
    label: 'Blood Oxygen (SpO2)',
    unit: '%',
    icon: Wind,
    hasSecondary: false,
    primaryLabel: 'Oxygen Saturation (%)',
    primaryPlaceholder: 'e.g. 98',
    adultTarget: 'Healthy Adult Target: 95% – 100% (Clinical standard)',
  },
};

/**
 * Evaluates whether the user's entered vitals are healthy, elevated, or critical.
 * Provides adult benchmark, clear "Is it OK?" verdict, and guidance.
 */
function evaluateVitals(type, primary, secondary) {
  const p = Number(primary);
  const s = secondary !== undefined && secondary !== '' ? Number(secondary) : null;

  if (isNaN(p) || p <= 0) return null;

  switch (type) {
    case 'blood_pressure': {
      if (s === null || isNaN(s) || s <= 0) {
        return {
          status: 'incomplete',
          title: 'Enter Diastolic value',
          message: 'Both systolic (upper) and diastolic (lower) numbers are needed for complete clinical classification.',
          color: 'slate',
        };
      }

      // Evaluation based on AHA / ACC Guidelines
      if (p >= 180 || s >= 120) {
        return {
          status: 'critical',
          isOk: false,
          badge: 'Hypertensive Crisis',
          title: '🔴 Critical: Hypertensive Crisis (Seek Emergency Care)',
          standard: 'Adult Target is < 120 / < 80 mmHg.',
          message: `Your reading of ${p}/${s} mmHg is critically high. If you have chest pain, shortness of breath, or numbness, seek emergency medical care immediately.`,
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
          indicator: 'bg-rose-500',
          meterPct: 98,
        };
      }
      if (p >= 140 || s >= 90) {
        return {
          status: 'warning',
          isOk: false,
          badge: 'Stage 2 Hypertension',
          title: '🟠 High: Stage 2 Hypertension',
          standard: 'Normal target for adults is < 120 / < 80 mmHg.',
          message: `Your reading of ${p}/${s} mmHg is significantly above standard range. Contact your doctor to evaluate medication or lifestyle interventions.`,
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
          indicator: 'bg-amber-500',
          meterPct: 78,
        };
      }
      if ((p >= 130 && p <= 139) || (s >= 80 && s <= 89)) {
        return {
          status: 'warning',
          isOk: false,
          badge: 'Stage 1 Hypertension',
          title: '🟡 Elevated: Stage 1 Hypertension',
          standard: 'Normal target for adults is < 120 / < 80 mmHg.',
          message: `Your reading of ${p}/${s} mmHg is in Stage 1 hypertension. Maintain hydration, lower dietary sodium, and log readings consistently.`,
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          indicator: 'bg-amber-400',
          meterPct: 60,
        };
      }
      if (p >= 120 && p <= 129 && s < 80) {
        return {
          status: 'elevated',
          isOk: true,
          badge: 'Elevated Pre-hypertension',
          title: '🟡 Borderline: Slightly Elevated Systolic',
          standard: 'Normal target for adults is < 120 / < 80 mmHg.',
          message: `Systolic is 120–129 mmHg. This is borderline. Healthy nutrition and routine exercise will help return it to ideal range.`,
          bg: 'bg-blue-500/15 border-blue-500/30 text-blue-200',
          indicator: 'bg-blue-400',
          meterPct: 45,
        };
      }
      if (p < 90 || s < 60) {
        return {
          status: 'low',
          isOk: false,
          badge: 'Hypotension (Low BP)',
          title: '🔵 Notice: Low Blood Pressure (< 90/60)',
          standard: 'Normal target for adults is 90–119 / 60–79 mmHg.',
          message: `Your reading is lower than standard. If you experience dizziness or lightheadedness, drink fluids and consult a doctor.`,
          bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200',
          indicator: 'bg-indigo-400',
          meterPct: 15,
        };
      }
      // Ideal
      return {
        status: 'optimal',
        isOk: true,
        badge: 'Normal & Healthy',
        title: '✅ OK! Optimal Healthy Blood Pressure',
        standard: 'Normal adult target is < 120 / < 80 mmHg.',
        message: `Great! Your reading of ${p}/${s} mmHg is within healthy adult clinical limits. Keep up your healthy lifestyle.`,
        bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
        indicator: 'bg-emerald-400',
        meterPct: 35,
      };
    }

    case 'heart_rate': {
      if (p < 45) {
        return {
          status: 'critical',
          isOk: false,
          badge: 'Severe Bradycardia',
          title: '🔴 Very Low Resting Heart Rate (< 45 bpm)',
          standard: 'Healthy resting range for adults is 60 – 100 bpm.',
          message: `A resting pulse below 45 bpm is very low (unless you are a competitive endurance athlete). Seek medical advice if feeling fatigued or faint.`,
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
          indicator: 'bg-rose-500',
          meterPct: 10,
        };
      }
      if (p < 60) {
        return {
          status: 'optimal',
          isOk: true,
          badge: 'Athletic / Low Resting',
          title: '🔵 Low / Athletic Resting Pulse (50–59 bpm)',
          standard: 'Standard adult resting range is 60 – 100 bpm.',
          message: `This is a very fit resting rate common in active individuals. It indicates efficient cardiac output if asymptomatic.`,
          bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-200',
          indicator: 'bg-indigo-400',
          meterPct: 25,
        };
      }
      if (p <= 100) {
        return {
          status: 'optimal',
          isOk: true,
          badge: 'Normal Resting Heart Rate',
          title: '✅ OK! Normal Resting Heart Rate (60–100 bpm)',
          standard: 'Standard adult resting range is 60 – 100 bpm.',
          message: `Your heart rate of ${p} bpm is in the healthy resting range.`,
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
          indicator: 'bg-emerald-400',
          meterPct: 45,
        };
      }
      if (p <= 130) {
        return {
          status: 'warning',
          isOk: false,
          badge: 'Elevated Resting Pulse',
          title: '🟡 Elevated: Tachycardia (101–130 bpm)',
          standard: 'Standard adult resting range is 60 – 100 bpm.',
          message: `Above normal resting baseline. If you recently exercised, had caffeine, or are stressed, this is expected. Rest for 10 minutes and recheck.`,
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
          indicator: 'bg-amber-400',
          meterPct: 75,
        };
      }
      return {
        status: 'critical',
        isOk: false,
        badge: 'High Tachycardia (> 130 bpm)',
        title: '🔴 Critical: Significantly High Pulse (> 130 bpm)',
        standard: 'Standard adult resting range is 60 – 100 bpm.',
        message: `High resting rate. If sustained while sitting down at rest, consult a medical professional promptly.`,
        bg: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
        indicator: 'bg-rose-500',
        meterPct: 95,
      };
    }

    case 'glucose': {
      if (p < 55) {
        return {
          status: 'critical',
          isOk: false,
          badge: 'Severe Hypoglycemia',
          title: '🔴 Critical: Low Blood Sugar (< 55 mg/dL)',
          standard: 'Healthy fasting glucose is 70 – 99 mg/dL.',
          message: `Dangerously low glucose. Consume 15–20 grams of fast-acting sugar (fruit juice, candy, honey) immediately.`,
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
          indicator: 'bg-rose-500',
          meterPct: 8,
        };
      }
      if (p < 70) {
        return {
          status: 'warning',
          isOk: false,
          badge: 'Low Sugar (Hypoglycemia)',
          title: '🟡 Low Blood Sugar (55–69 mg/dL)',
          standard: 'Healthy fasting glucose is 70 – 99 mg/dL.',
          message: `Your sugar is below the normal threshold. Have a snack or meal to stabilize your energy.`,
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
          indicator: 'bg-amber-400',
          meterPct: 20,
        };
      }
      if (p <= 99) {
        return {
          status: 'optimal',
          isOk: true,
          badge: 'Healthy Fasting Range',
          title: '✅ OK! Optimal Fasting Blood Glucose',
          standard: 'Healthy fasting glucose is 70 – 99 mg/dL.',
          message: `Your blood sugar of ${p} mg/dL is in the optimal healthy range.`,
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
          indicator: 'bg-emerald-400',
          meterPct: 40,
        };
      }
      if (p <= 125) {
        return {
          status: 'warning',
          isOk: false,
          badge: 'Pre-diabetic Range (Fasting)',
          title: '🟡 Borderline High: 100–125 mg/dL',
          standard: 'Healthy fasting is 70–99 mg/dL (or < 140 mg/dL if 2h post-meal).',
          message: `If taken while fasting, 100–125 mg/dL suggests pre-diabetes. If taken right after eating, this is completely normal.`,
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
          indicator: 'bg-amber-400',
          meterPct: 65,
        };
      }
      if (p <= 199) {
        return {
          status: 'warning',
          isOk: false,
          badge: 'Elevated Glucose (> 125 mg/dL)',
          title: '🟠 Elevated: High Blood Sugar',
          standard: 'Healthy fasting is 70–99 mg/dL. Normal post-meal is < 140 mg/dL.',
          message: `Elevated reading. If you haven't eaten in 8 hours, this is in the diabetic threshold. Discuss with your physician.`,
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
          indicator: 'bg-amber-500',
          meterPct: 82,
        };
      }
      return {
        status: 'critical',
        isOk: false,
        badge: 'Severe Hyperglycemia',
        title: '🔴 Critical: Very High Sugar (≥ 200 mg/dL)',
        standard: 'Normal target is < 140 mg/dL.',
        message: `High blood sugar reading. Hydrate with water, check ketones if advised by your doctor, and seek medical consultation.`,
        bg: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
        indicator: 'bg-rose-500',
        meterPct: 96,
      };
    }

    case 'spo2': {
      if (p >= 95 && p <= 100) {
        return {
          status: 'optimal',
          isOk: true,
          badge: 'Optimal Oxygenation',
          title: '✅ OK! Normal Healthy Oxygen Saturation (95–100%)',
          standard: 'Healthy adult target is 95% – 100%.',
          message: `Your SpO2 of ${p}% indicates excellent arterial blood oxygenation and healthy respiratory function.`,
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
          indicator: 'bg-emerald-400',
          meterPct: 95,
        };
      }
      if (p >= 90 && p <= 94) {
        return {
          status: 'warning',
          isOk: false,
          badge: 'Mild Hypoxemia (90–94%)',
          title: '🟡 Warning: Mildly Low Oxygen Level',
          standard: 'Healthy adult target is 95% – 100%.',
          message: `Your oxygen saturation of ${p}% is slightly depressed. Sit upright, breathe deeply, and re-test. If you feel breathless, consult a healthcare provider.`,
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
          indicator: 'bg-amber-400',
          meterPct: 55,
        };
      }
      return {
        status: 'critical',
        isOk: false,
        badge: 'Severe Hypoxemia (< 90%)',
        title: '🔴 Critical: Low Oxygen Saturation (< 90%)',
        standard: 'Healthy adult target is 95% – 100%.',
        message: `Oxygen levels under 90% require prompt clinical attention. Ensure the pulse oximeter is properly placed and contact emergency medical services if accompanied by shortness of breath.`,
        bg: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
        indicator: 'bg-rose-500',
        meterPct: 20,
      };
    }

    default:
      return null;
  }
}

export default function LogVitalModal({ isOpen, onClose, onVitalLogged }) {
  const [metricType, setMetricType] = useState('blood_pressure');
  const [valuePrimary, setValuePrimary] = useState('');
  const [valueSecondary, setValueSecondary] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setValuePrimary('');
      setValueSecondary('');
      setError('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const currentConfig = METRIC_CONFIG[metricType];

  // Dynamic clinical evaluation
  const evaluation = useMemo(() => {
    return evaluateVitals(metricType, valuePrimary, valueSecondary);
  }, [metricType, valuePrimary, valueSecondary]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valuePrimary) {
      setError('Please provide a primary metric value.');
      return;
    }

    if (currentConfig.hasSecondary && !valueSecondary) {
      setError('Please provide diastolic blood pressure value.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await logVital({
        metricType,
        valuePrimary: Number(valuePrimary),
        valueSecondary: currentConfig.hasSecondary ? Number(valueSecondary) : null,
        unit: currentConfig.unit,
      });
      onVitalLogged();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log vital metric.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-modal-backdrop" onClick={onClose}>
      <div className="h-modal-card max-w-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header matching Vault */}
        <div className="h-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>Record Biometric Vital</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-semibold text-indigo-300">
                  Live Diagnostic Check
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant clinical feedback comparing against adult target benchmarks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
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

          {/* Metric Selector Pills (Vault-style tabs) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-2">
              Select Biometric Measurement
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(METRIC_CONFIG).map(([typeKey, cfg]) => {
                const IconComponent = cfg.icon;
                const isSelected = metricType === typeKey;
                return (
                  <button
                    type="button"
                    key={typeKey}
                    onClick={() => {
                      setMetricType(typeKey);
                      setValuePrimary('');
                      setValueSecondary('');
                      setError('');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 scale-[1.02]'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="truncate w-full">{cfg.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adult Standard Target Reference Box */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-blue-300">Adult Target: </span>
              {currentConfig.adultTarget}
            </div>
          </div>

          {/* Numeric Value Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                {currentConfig.primaryLabel} <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  className="h-input font-mono text-base font-bold pr-14"
                  placeholder={currentConfig.primaryPlaceholder}
                  value={valuePrimary}
                  onChange={(e) => setValuePrimary(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  {currentConfig.unit}
                </span>
              </div>
            </div>

            {currentConfig.hasSecondary && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  {currentConfig.secondaryLabel} <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    className="h-input font-mono text-base font-bold pr-14"
                    placeholder={currentConfig.secondaryPlaceholder}
                    value={valueSecondary}
                    onChange={(e) => setValueSecondary(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    {currentConfig.unit}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── LIVE CLINICAL DIAGNOSTIC EVALUATION (Is it OK or not?) ── */}
          {evaluation && (
            <div className={`p-4 rounded-xl border transition-all duration-200 space-y-2.5 ${evaluation.bg}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide">
                    {evaluation.title}
                  </span>
                </div>
                {evaluation.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/30 border border-white/10 uppercase">
                    {evaluation.badge}
                  </span>
                )}
              </div>

              {/* Range Spectrum Progress Bar */}
              {evaluation.meterPct && (
                <div className="space-y-1 pt-1">
                  <div className="h-2 w-full bg-slate-900/80 rounded-full overflow-hidden border border-white/10 relative">
                    <div
                      className={`h-full transition-all duration-300 ${evaluation.indicator}`}
                      style={{ width: `${evaluation.meterPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] opacity-75 font-mono">
                    <span>Low</span>
                    <span>Target Healthy</span>
                    <span>Elevated</span>
                    <span>Critical</span>
                  </div>
                </div>
              )}

              {/* Explanatory Clinical Text */}
              <p className="text-xs leading-relaxed opacity-95">
                {evaluation.message}
              </p>

              <div className="text-[11px] pt-1 border-t border-white/10 opacity-80 flex items-center gap-1">
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span>Standard Benchmark: {evaluation.standard}</span>
              </div>
            </div>
          )}

          {/* Footer with Vault Buttons */}
          <div className="h-modal-footer -mx-6 -mb-6 mt-6">
            <button type="button" onClick={onClose} className="vault-btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !valuePrimary}
              className="vault-btn-action"
            >
              {saving ? 'Recording...' : 'Save & Log Vital'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
