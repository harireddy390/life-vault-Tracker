import React, { useState, useEffect, useRef } from 'react';
import Toast from '../components/Toast';
import { formatDateKey } from '../utils/dateUtils';
import './Health.css';

// Health API Services
import {
  getEmergencyProfile,
  getVitals,
  getMedications,
  getRecords,
  deleteMedication,
  deleteRecord,
  getDailyHealthMetric,
  saveDailyHealthMetric,
  getHealthMetricsHistory,
  quickUpdateWater,
  toggleMedTaken,
  logWorkout,
  deleteWorkout,
} from '../services/healthService';

// Zone & Health Components
import DailyBiometricsCard from '../components/health/DailyBiometricsCard';
import HealthTrendChart from '../components/health/HealthTrendChart';
import MedicationScheduleTracker from '../components/health/MedicationScheduleTracker';
import WorkoutActivityLogger from '../components/health/WorkoutActivityLogger';
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
  Activity,
  Pill,
  Dumbbell,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export default function Health() {
  // ── Toast State ──
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Active Tab ──
  // 'biometrics' | 'medications' | 'workouts' | 'clinical'
  const [activeTab, setActiveTab] = useState('biometrics');

  // ── Selected Date for Daily Tracking ──
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));

  // ── Daily Health Metric State ──
  const [dailyMetric, setDailyMetric] = useState({
    date: selectedDate,
    weight: null,
    water: 0,
    sleep: 0,
    restingHeartRate: null,
    calories: 0,
    meds: [],
    workouts: [],
    notes: '',
  });

  // ── Biometric Trend History (14 days) ──
  const [history, setHistory] = useState([]);

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

  // ── Load Daily Metric whenever selectedDate changes ──
  const loadDailyData = async (date) => {
    try {
      const data = await getDailyHealthMetric(date, (revalidated) => {
        setDailyMetric(revalidated);
      });
      if (data) setDailyMetric(data);
    } catch (err) {
      console.warn('Could not load daily health metric:', err.message);
    }
  };

  // ── Load History for Trend Charts ──
  const loadHistory = async () => {
    try {
      const data = await getHealthMetricsHistory(14, (revalidated) => {
        setHistory(revalidated || []);
      });
      if (data) setHistory(data);
    } catch (err) {
      console.warn('Could not load health history:', err.message);
    }
  };

  // ── Load Clinical & Profile Data ──
  const loadClinicalData = async () => {
    try {
      setLoading(true);
      const [emergencyRes, vitalsRes, medsRes, recordsRes] = await Promise.all([
        getEmergencyProfile().catch(() => ({ profile: null, contacts: [] })),
        getVitals().catch(() => ({ latest: {}, history: [] })),
        getMedications().catch(() => []),
        getRecords({ category: activeCategory, search: searchQuery }).catch(() => []),
      ]);

      setEmergencyData(emergencyRes || { profile: null, contacts: [] });
      setVitalsData(vitalsRes || { latest: {}, history: [] });
      setMedications(medsRes || []);
      setRecords(recordsRes || []);
    } catch (err) {
      console.error('Error fetching health clinical data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyData(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    loadHistory();
    loadClinicalData();
  }, []);

  useEffect(() => {
    getRecords({ category: activeCategory, search: searchQuery })
      .then((data) => setRecords(data || []))
      .catch((err) => console.error('Failed to filter records:', err));
  }, [activeCategory, searchQuery]);

  // ── Handlers for Daily Biometrics ──
  const handleSaveDailyMetric = async (updates) => {
    try {
      const updated = await saveDailyHealthMetric(selectedDate, updates);
      setDailyMetric(updated);
      await loadHistory();
      showToast('Daily biometrics saved successfully.');
    } catch (err) {
      showToast('Failed to save biometrics.', 'error');
    }
  };

  const handleWaterChange = async (delta) => {
    try {
      const updated = await quickUpdateWater(selectedDate, { delta });
      setDailyMetric((prev) => ({ ...prev, water: updated.water }));
      loadHistory();
    } catch (err) {
      showToast('Failed to update hydration.', 'error');
    }
  };

  const handleToggleMed = async (medPayload) => {
    try {
      const res = await toggleMedTaken(selectedDate, medPayload);
      if (res.metric) {
        setDailyMetric(res.metric);
      }
      showToast(
        medPayload.taken ? 'Dose marked as taken! Streak updated 🔥' : 'Dose marked as pending.'
      );
    } catch (err) {
      showToast('Could not update medication schedule.', 'error');
    }
  };

  const handleLogWorkout = async (workoutData) => {
    try {
      const updated = await logWorkout(selectedDate, workoutData);
      setDailyMetric(updated);
      showToast('Workout session logged successfully! 🏋️');
    } catch (err) {
      showToast('Could not log workout.', 'error');
    }
  };

  const handleDeleteWorkout = async (workoutId) => {
    try {
      const updated = await deleteWorkout(selectedDate, workoutId);
      setDailyMetric(updated);
      showToast('Workout removed from today’s log.');
    } catch (err) {
      showToast('Could not delete workout.', 'error');
    }
  };

  // ── Delete Handler for Clinical Items ──
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

  return (
    <div className="health-page space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <Toast message={toast?.message} type={toast?.type} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Health & Vitals Hub
            </h1>
            <span className="vault-badge-encrypted">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Clinical Telemetry</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Comprehensive daily biometrics, trend analytics, medication adherence, gym logging, and diagnostic records.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('biometrics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'biometrics'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Biometrics & Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('medications')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'medications'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-4 h-4 text-purple-600" />
            <span>Meds & Supplements</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workouts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workouts'
                ? 'bg-white text-orange-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Dumbbell className="w-4 h-4 text-orange-600" />
            <span>Workout & Activity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clinical')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'clinical'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-600" />
            <span>Clinical Records</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Biometrics & Trend Analysis */}
      {activeTab === 'biometrics' && (
        <div className="space-y-6">
          <DailyBiometricsCard
            date={selectedDate}
            metric={dailyMetric}
            onDateChange={setSelectedDate}
            onSaveMetric={handleSaveDailyMetric}
            onWaterChange={handleWaterChange}
          />

          <HealthTrendChart history={history} />
        </div>
      )}

      {/* TAB 2: Medications & Supplement Schedule */}
      {activeTab === 'medications' && (
        <div className="space-y-6">
          <MedicationScheduleTracker
            date={selectedDate}
            meds={dailyMetric.meds || []}
            onToggleMed={handleToggleMed}
            onOpenAddMed={() => setIsAddMedOpen(true)}
          />

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
              loadDailyData(selectedDate);
              showToast('Dose updated successfully');
            }}
          />
        </div>
      )}

      {/* TAB 3: Workouts & Daily Movement */}
      {activeTab === 'workouts' && (
        <div className="space-y-6">
          <WorkoutActivityLogger
            date={selectedDate}
            workouts={dailyMetric.workouts || []}
            onLogWorkout={handleLogWorkout}
            onDeleteWorkout={handleDeleteWorkout}
          />
        </div>
      )}

      {/* TAB 4: Clinical Diagnostics & Encrypted Records */}
      {activeTab === 'clinical' && (
        <div className="space-y-6">
          <MedicalIDBanner
            profile={emergencyData.profile}
            contacts={emergencyData.contacts}
            onOpenEdit={() => setIsMedicalIDOpen(true)}
          />

          <VitalsGrid
            vitalsData={vitalsData}
            onOpenLogModal={() => setIsLogVitalOpen(true)}
          />

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
                message: `Are you sure you want to permanently delete "${record.originalName}"?`,
              })
            }
          />
        </div>
      )}

      {/* ── Modals ── */}
      {isMedicalIDOpen && (
        <MedicalIDModal
          isOpen={isMedicalIDOpen}
          onClose={() => setIsMedicalIDOpen(false)}
          profile={emergencyData.profile}
          contacts={emergencyData.contacts}
          onSuccess={(updated) => {
            setEmergencyData((prev) => ({ ...prev, ...updated }));
            showToast('Medical profile updated');
          }}
        />
      )}

      {isLogVitalOpen && (
        <LogVitalModal
          isOpen={isLogVitalOpen}
          onClose={() => setIsLogVitalOpen(false)}
          onSuccess={async () => {
            const data = await getVitals();
            setVitalsData(data || { latest: {}, history: [] });
            showToast('Vital reading recorded');
          }}
        />
      )}

      {isAddMedOpen && (
        <AddMedicationModal
          isOpen={isAddMedOpen}
          onClose={() => setIsAddMedOpen(false)}
          onSuccess={async () => {
            const data = await getMedications();
            setMedications(data || []);
            loadDailyData(selectedDate);
            showToast('Medication added to regimen');
          }}
        />
      )}

      {isUploadRecordOpen && (
        <UploadRecordModal
          isOpen={isUploadRecordOpen}
          onClose={() => setIsUploadRecordOpen(false)}
          onRecordUploaded={async () => {
            const data = await getRecords({ category: activeCategory, search: searchQuery });
            setRecords(data || []);
            showToast('Diagnostic document uploaded to encrypted storage');
          }}
          onSuccess={async () => {
            const data = await getRecords({ category: activeCategory, search: searchQuery });
            setRecords(data || []);
            showToast('Diagnostic document uploaded to encrypted storage');
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          title={deleteTarget.title}
          message={deleteTarget.message}
          loading={deleting}
        />
      )}
    </div>
  );
}
