import React, { useState, useEffect, useRef } from 'react';
import Toast from '../components/Toast';
import './Health.css';

// Health API Services
import {
  getEmergencyProfile,
  getVitals,
  getMedications,
  getRecords,
  deleteMedication,
  deleteRecord,
} from '../services/healthService';

// Zone Components
import MedicalIDBanner from '../components/health/MedicalIDBanner';
import VitalsGrid from '../components/health/VitalsGrid';
import MedicationsPanel from '../components/health/MedicationsPanel';
import HealthRecords from '../components/health/HealthRecords';

// Modals
import MedicalIDModal from '../components/health/modals/MedicalIDModal';
import LogVitalModal from '../components/health/modals/LogVitalModal';
import AddMedicationModal from '../components/health/modals/AddMedicationModal';
import UploadRecordModal from '../components/health/modals/UploadRecordModal';
import ConfirmDeleteModal from '../components/health/modals/ConfirmDeleteModal';

// Icons
import {
  HeartPulse,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

const TOTAL_GLASSES = 8;
const POSTURE_INTERVAL_MIN = 30;

export default function Health() {
  // ── Toast State ──
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Clinical Health States ──
  const [loading, setLoading] = useState(true);
  const [emergencyData, setEmergencyData] = useState({ profile: null, contacts: [] });
  const [vitalsData, setVitalsData] = useState({ latest: {}, history: [] });
  const [medications, setMedications] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Modals State ──
  const [isMedicalIDOpen, setIsMedicalIDOpen] = useState(false);
  const [isLogVitalOpen, setIsLogVitalOpen] = useState(false);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isUploadRecordOpen, setIsUploadRecordOpen] = useState(false);

  // ── Delete Confirmation State ──
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Preserved Wellness Widgets State ──
  const [showWellness, setShowWellness] = useState(false);
  const [waterCount, setWaterCount] = useState(Number(localStorage.getItem('lv_water_count')) || 0);
  const [sleepHrs, setSleepHrs] = useState(Number(localStorage.getItem('lv_sleep_hrs')) || 0);
  const [sleepInput, setSleepInput] = useState('');

  const [postureSecondsLeft, setPostureSecondsLeft] = useState(POSTURE_INTERVAL_MIN * 60);
  const [postureRunning, setPostureRunning] = useState(false);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  // ── Fetch Health Data ──
  const loadAllHealthData = async () => {
    try {
      setLoading(true);
      const [emergencyRes, vitalsRes, medsRes, recordsRes] = await Promise.all([
        getEmergencyProfile().catch((err) => {
          console.error('Failed to load emergency profile:', err);
          return { profile: null, contacts: [] };
        }),
        getVitals().catch((err) => {
          console.error('Failed to load vitals:', err);
          return { latest: {}, history: [] };
        }),
        getMedications().catch((err) => {
          console.error('Failed to load medications:', err);
          return [];
        }),
        getRecords({ category: activeCategory, search: searchQuery }).catch((err) => {
          console.error('Failed to load records:', err);
          return [];
        }),
      ]);

      setEmergencyData(emergencyRes || { profile: null, contacts: [] });
      setVitalsData(vitalsRes || { latest: {}, history: [] });
      setMedications(medsRes || []);
      setRecords(recordsRes || []);
    } catch (err) {
      console.error('Error fetching health dashboard data:', err);
      showToast('Could not fetch all clinical data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async (category = activeCategory, search = searchQuery) => {
    try {
      const data = await getRecords({ category, search });
      setRecords(data || []);
    } catch (err) {
      console.error('Failed to filter records:', err);
    }
  };

  useEffect(() => {
    loadAllHealthData();
  }, []);

  useEffect(() => {
    loadRecords(activeCategory, searchQuery);
  }, [activeCategory, searchQuery]);

  // ── Delete Handler ──
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'med') {
        await deleteMedication(deleteTarget.item._id);
        setMedications((prev) => prev.filter((m) => m._id !== deleteTarget.item._id));
        showToast('Medication removed from regimen');
      } else if (deleteTarget.type === 'record') {
        await deleteRecord(deleteTarget.item._id);
        setRecords((prev) => prev.filter((r) => r._id !== deleteTarget.item._id));
        showToast('Health record permanently deleted');
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Failed to delete item', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Wellness Timer & Audio ──
  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playPostureChime = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(784, now, 0.35);
    playTone(1047, now + 0.18, 0.4);
  };

  useEffect(() => {
    if (!postureRunning) return;
    intervalRef.current = setInterval(() => {
      setPostureSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [postureRunning]);

  useEffect(() => {
    if (postureSecondsLeft > 0) return;
    playPostureChime();
    showToast('Time to stand up and stretch! 🧘', 'info');
    setPostureSecondsLeft(POSTURE_INTERVAL_MIN * 60);
  }, [postureSecondsLeft]);

  const addWater = (count) => {
    setWaterCount(count);
    localStorage.setItem('lv_water_count', count);
  };
  const resetWater = () => addWater(0);

  const saveSleep = (e) => {
    e.preventDefault();
    if (!sleepInput) return;
    const n = Number(sleepInput);
    setSleepHrs(n);
    localStorage.setItem('lv_sleep_hrs', n);
    setSleepInput('');
    showToast('Sleep logged.');
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const hydrationPct = Math.round((waterCount / TOTAL_GLASSES) * 100);

  return (
    <div className="health-page space-y-6">
      <Toast message={toast?.message} type={toast?.type} />

      {/* ── Page Header (Exact match to Vault Header Row) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Medical & Health Hub
            </h1>
            <span className="vault-badge-encrypted">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Clinical Telemetry</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Intelligent medical profile, vitals tracking with clinical benchmarks, active prescriptions, and encrypted diagnostic repository.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={() => setShowWellness((prev) => !prev)}
            className="vault-btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showWellness ? 'Hide Daily Habits' : 'Daily Wellness Habits'}</span>
            {showWellness ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ZONE 1: Emergency Medical ID & Responders */}
      <section aria-label="Emergency Profile">
        <MedicalIDBanner
          profile={emergencyData.profile}
          contacts={emergencyData.contacts}
          onOpenEdit={() => setIsMedicalIDOpen(true)}
        />
      </section>

      {/* ZONE 2: Biometric Vitals Stream with Adult Targets */}
      <section aria-label="Biometrics Stream">
        <VitalsGrid
          vitalsData={vitalsData}
          onOpenLogModal={() => setIsLogVitalOpen(true)}
        />
      </section>

      {/* ZONE 3: Active Medications Regimen */}
      <section aria-label="Medications Regimen">
        <MedicationsPanel
          medications={medications}
          onOpenAddModal={() => setIsAddMedOpen(true)}
          onDeleteClick={(med) =>
            setDeleteTarget({
              type: 'med',
              item: med,
              title: `Delete ${med.name}?`,
              message: `Are you sure you want to delete ${med.name} (${med.dosage}) from your active medication regimen?`,
            })
          }
          onMedicationUpdated={async () => {
            const data = await getMedications();
            setMedications(data || []);
            showToast('Dose logged successfully');
          }}
        />
      </section>

      {/* ZONE 4: Clinical Diagnostic Vault */}
      <section aria-label="Health Documents">
        <HealthRecords
          records={records}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenUploadModal={() => setIsUploadRecordOpen(true)}
          onDeleteClick={(record) =>
            setDeleteTarget({
              type: 'record',
              item: record,
              title: `Delete ${record.title}?`,
              message: `Are you sure you want to permanently delete the document "${record.originalName}"? The encrypted file will be purged.`,
            })
          }
        />
      </section>

      {/* PRESERVED WELLNESS WIDGETS SECTION */}
      {showWellness && (
        <div className="wellness-section pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daily Wellness & Posture Habits
            </h3>
          </div>

          <div className="health-grid">
            {/* Hydration Panel */}
            <div className="h-card health-panel">
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Daily Hydration</p>
              <div className="hydration-ring-wrap">
                <div
                  className="hydration-ring"
                  style={{
                    background: `conic-gradient(#4f46e5 ${hydrationPct * 3.6}deg, #e2e8f0 0deg)`,
                  }}
                >
                  <div className="hydration-ring-center">
                    <span className="hydration-pct">{hydrationPct}%</span>
                    <span className="hydration-label">
                      {waterCount}/{TOTAL_GLASSES} glasses
                    </span>
                  </div>
                </div>
              </div>
              <div className="water-drops-large">
                {Array.from({ length: TOTAL_GLASSES }).map((_, i) => (
                  <button
                    key={i}
                    className="water-drop-btn-lg"
                    onClick={() => addWater(i + 1)}
                    style={{ opacity: i < waterCount ? 1 : 0.25 }}
                    aria-label={`Set water intake to ${i + 1} glasses`}
                  >
                    {'💧'}
                  </button>
                ))}
              </div>
              <button className="vault-btn-ghost w-full text-xs" onClick={resetWater}>
                Reset for the day
              </button>
            </div>

            {/* Posture Check */}
            <div className="h-card health-panel">
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Posture Alert</p>
              <p className="text-xs text-slate-500">Gentle chime every {POSTURE_INTERVAL_MIN} minutes to sit up and stretch.</p>
              <div className="posture-timer">{formatTime(postureSecondsLeft)}</div>
              <div className="flex items-center justify-center gap-2">
                <button
                  className="vault-btn-action text-xs"
                  onClick={() => {
                    ensureAudioContext();
                    setPostureRunning(true);
                  }}
                  disabled={postureRunning}
                >
                  Start
                </button>
                <button
                  className="vault-btn-ghost text-xs"
                  onClick={() => setPostureRunning(false)}
                  disabled={!postureRunning}
                >
                  Pause
                </button>
                <button
                  className="vault-btn-ghost text-xs"
                  onClick={() => {
                    setPostureRunning(false);
                    setPostureSecondsLeft(POSTURE_INTERVAL_MIN * 60);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Sleep Log */}
            <div className="h-card health-panel">
              <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Sleep Log</p>
              <p className="health-log-value">{sleepHrs ? `${sleepHrs}h` : '—'}</p>
              <form className="health-log-form flex gap-2" onSubmit={saveSleep}>
                <input
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 flex-1"
                  type="number"
                  step="0.5"
                  placeholder="Hours slept last night"
                  value={sleepInput}
                  onChange={(e) => setSleepInput(e.target.value)}
                />
                <button className="vault-btn-action text-xs shrink-0" type="submit">
                  Save
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS (High-contrast dark floating modals matching Vault UploadModal) ── */}
      <MedicalIDModal
        isOpen={isMedicalIDOpen}
        profile={emergencyData.profile}
        contacts={emergencyData.contacts}
        onClose={() => setIsMedicalIDOpen(false)}
        onSaved={async () => {
          const data = await getEmergencyProfile();
          setEmergencyData(data);
          showToast('Medical Profile updated successfully');
        }}
      />

      <LogVitalModal
        isOpen={isLogVitalOpen}
        onClose={() => setIsLogVitalOpen(false)}
        onVitalLogged={async () => {
          const vitals = await getVitals();
          setVitalsData(vitals);
          showToast('Vital reading recorded');
        }}
      />

      <AddMedicationModal
        isOpen={isAddMedOpen}
        onClose={() => setIsAddMedOpen(false)}
        onMedicationAdded={async () => {
          const meds = await getMedications();
          setMedications(meds);
          showToast('Medication added to regimen');
        }}
      />

      <UploadRecordModal
        isOpen={isUploadRecordOpen}
        onClose={() => setIsUploadRecordOpen(false)}
        onRecordUploaded={async () => {
          await loadRecords();
          showToast('Health document stored securely');
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title}
        message={deleteTarget?.message}
        confirming={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}