import { useEffect, useState, useMemo } from 'react';
import {
  Target,
  Plus,
  TrendingUp,
  Award,
  CheckCircle2,
  Filter,
  Search,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Briefcase,
  HeartPulse,
  Scale,
  GraduationCap,
  Compass,
} from 'lucide-react';
import goalService from '../services/goalService';
import GoalCard from '../components/goals/GoalCard';
import CreateEditGoalModal from '../components/goals/CreateEditGoalModal';
import LogProgressModal from '../components/goals/LogProgressModal';
import AttachProofModal from '../components/goals/AttachProofModal';
import CelebrationToast from '../components/goals/CelebrationToast';
import TrophyArchive from '../components/goals/TrophyArchive';
import Toast from '../components/Toast';
import './Goals.css';

const CATEGORIES = [
  { id: 'All', label: 'All Goals', icon: Layers },
  { id: 'Finance', label: 'Finance', icon: Briefcase },
  { id: 'Career', label: 'Career', icon: GraduationCap },
  { id: 'Health_Fitness', label: 'Health & Fitness', icon: HeartPulse },
  { id: 'Personal_Development', label: 'Personal Dev', icon: Sparkles },
  { id: 'Travel', label: 'Travel', icon: Compass },
  { id: 'Other', label: 'Other', icon: Target },
];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'all' | 'ahead' | 'attention'
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Modals state
  const [createEditModal, setCreateEditModal] = useState({ open: false, goal: null });
  const [logProgressGoal, setLogProgressGoal] = useState(null);
  const [attachProofGoal, setAttachProofGoal] = useState(null);
  const [celebrationGoal, setCelebrationGoal] = useState(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await goalService.getGoals();
      setGoals(data);
    } catch (err) {
      showToast('Could not load goals. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // -------------------------------------------------------------
  // Summary Metrics Calculations
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const active = goals.filter((g) => g.status === 'active' || g.status === 'behind');
    const completed = goals.filter((g) => g.status === 'completed' || Number(g.progress_pct) >= 100);

    // Overall Completion Rate (%)
    const completionRate =
      goals.length > 0 ? Math.round((completed.length / goals.length) * 100) : 0;

    // Completed this year (current year)
    const currentYear = new Date().getFullYear();
    const completedThisYear = completed.filter((g) => {
      const d = g.completed_at || g.updatedAt;
      return d && new Date(d).getFullYear() === currentYear;
    }).length;

    // Category active counts
    const countsByCategory = {};
    CATEGORIES.forEach((cat) => {
      if (cat.id === 'All') {
        countsByCategory[cat.id] = active.length;
      } else {
        countsByCategory[cat.id] = active.filter(
          (g) =>
            g.category === cat.id ||
            g.category?.toLowerCase() === cat.id.toLowerCase()
        ).length;
      }
    });

    return {
      activeCount: active.length,
      completionRate,
      completedThisYear,
      countsByCategory,
    };
  }, [goals]);

  // -------------------------------------------------------------
  // Filtered Goals
  // -------------------------------------------------------------
  const { displayActiveGoals, completedGoals } = useMemo(() => {
    const active = goals.filter((g) => g.status !== 'completed' && Number(g.progress_pct) < 100);
    const completed = goals.filter((g) => g.status === 'completed' || Number(g.progress_pct) >= 100);

    let filtered = active;

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(
        (g) =>
          g.category === selectedCategory ||
          g.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Secondary Status / Pace filter
    if (statusFilter === 'ahead') {
      filtered = filtered.filter((g) => g.pace === 'ahead');
    } else if (statusFilter === 'attention') {
      filtered = filtered.filter(
        (g) => g.pace === 'needs_attention' || g.pace === 'falling_behind' || g.days_remaining < 0
      );
    } else if (statusFilter === 'all') {
      filtered = goals;
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(
          (g) =>
            g.category === selectedCategory ||
            g.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.title?.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q)
      );
    }

    return {
      displayActiveGoals: filtered,
      completedGoals: completed,
    };
  }, [goals, selectedCategory, statusFilter, searchQuery]);

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  const handleSaveGoal = async (formData, goalId) => {
    if (goalId) {
      const updated = await goalService.updateGoal(goalId, formData);
      setGoals((prev) => prev.map((g) => (g._id === goalId || g.id === goalId ? updated : g)));
      showToast('Goal updated successfully.');
    } else {
      const created = await goalService.createGoal(formData);
      setGoals((prev) => [created, ...prev]);
      showToast('New goal established!');
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goal and all attached proof/milestones?')) {
      return;
    }
    try {
      await goalService.deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g._id !== id && g.id !== id));
      showToast('Goal removed.');
    } catch {
      showToast('Could not delete goal.', 'error');
    }
  };

  const handleLogProgressSave = async (goalId, { logged_value, note }) => {
    const res = await goalService.logCheckin(goalId, { logged_value, note });
    if (res.goal) {
      setGoals((prev) =>
        prev.map((g) => (g._id === goalId || g.id === goalId ? res.goal : g))
      );
    }
    showToast(`Logged +${logged_value} progress.`);
    if (res.completedJustNow || res.goal?.status === 'completed') {
      setCelebrationGoal(res.goal);
    }
  };

  const handleToggleMilestone = async (milestoneId) => {
    // Optimistic local state update
    setGoals((prev) =>
      prev.map((g) => {
        const hasM = g.milestones?.some((m) => m._id === milestoneId || m.id === milestoneId);
        if (!hasM) return g;
        const updatedMilestones = g.milestones.map((m) =>
          m._id === milestoneId || m.id === milestoneId
            ? { ...m, is_completed: !m.is_completed }
            : m
        );
        return { ...g, milestones: updatedMilestones };
      })
    );

    try {
      const res = await goalService.toggleMilestone(milestoneId);
      if (res.goal) {
        setGoals((prev) =>
          prev.map((g) =>
            g._id === res.goal._id || g.id === res.goal.id ? res.goal : g
          )
        );
        if (res.goal.status === 'completed') {
          setCelebrationGoal(res.goal);
        }
      }
    } catch {
      showToast('Could not toggle milestone.', 'error');
      loadGoals();
    }
  };

  const handleUpdateGoalFromModal = (updatedGoal) => {
    setGoals((prev) =>
      prev.map((g) =>
        g._id === updatedGoal._id || g.id === updatedGoal.id ? updatedGoal : g
      )
    );
    if (attachProofGoal && (attachProofGoal._id === updatedGoal._id || attachProofGoal.id === updatedGoal.id)) {
      setAttachProofGoal(updatedGoal);
    }
  };

  return (
    <div className="goals-page-container">
      <Toast message={toast?.message} type={toast?.type} />

      {/* ========================================================= */}
      {/* 1. HEADER ROW (Vault & Health System Alignment)          */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="goals-badge-pill mb-2">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span>Objectives & Key Results</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Goals & Milestones
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Track metrics, manage sequential milestone checklists, attach verified certificates, and measure pacing in real time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadGoals}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
            title="Refresh Goals"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin text-indigo-600' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setCreateEditModal({ open: true, goal: null })}
            className="vault-btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* METRIC SUMMARY CARDS (Matching Vault & Health white cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Active Goals Count */}
        <div className="metric-summary-card p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Active Goals
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {metrics.activeCount}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Currently in progress
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Target size={22} />
          </div>
        </div>

        {/* Overall Completion Rate */}
        <div className="metric-summary-card p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Overall Completion Rate
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
              {metrics.completionRate}%
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Across all targets set
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Trophy Chip: Completed This Year */}
        <div className="metric-summary-card p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Completed This Year
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 flex items-center gap-2">
              {metrics.completedThisYear}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                🏆 {new Date().getFullYear()}
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Archived in trophy shelf
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Award size={22} />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. CATEGORY TABS (Matching Vault .category-tabs-container) */}
      {/* ========================================================= */}
      <div className="goals-category-tabs mb-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = metrics.countsByCategory[cat.id] || 0;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`goals-category-pill ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 3. CONTROLS BAR (Matching Vault .vault-controls-bar)      */}
      {/* ========================================================= */}
      <div className="goals-controls-bar">
        {/* Quick status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'active'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ahead')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'ahead'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            Ahead of Pace
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('attention')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'attention'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            Needs Attention
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            All
          </button>
        </div>

        {/* Search box */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search goals..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. GOALS GRID (Matching Vault & Health Card Aesthetics)  */}
      {/* ========================================================= */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 rounded-full border-3 border-slate-200 border-t-indigo-600 animate-spin" />
          <span className="text-slate-500 text-xs font-medium">Loading goals and live pacing...</span>
        </div>
      ) : displayActiveGoals.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white p-8 max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
            <Target size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No matching goals</h3>
          <p className="text-xs text-slate-500 mb-4">
            {searchQuery
              ? `No goals matched "${searchQuery}". Clear your search query to see other goals.`
              : `No active goals found in ${selectedCategory}. Click below to establish a new goal.`}
          </p>
          <button
            type="button"
            onClick={() => setCreateEditModal({ open: true, goal: null })}
            className="vault-btn-primary"
          >
            <Plus className="w-4 h-4" /> <span>Establish New Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayActiveGoals.map((goal) => (
            <GoalCard
              key={goal._id || goal.id}
              goal={goal}
              onEdit={(g) => setCreateEditModal({ open: true, goal: g })}
              onDelete={handleDeleteGoal}
              onLogProgress={(g) => setLogProgressGoal(g)}
              onAttachProof={(g) => setAttachProofGoal(g)}
              onToggleMilestone={handleToggleMilestone}
            />
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TROPHY ARCHIVE (COMPLETED GOALS SHELF)                 */}
      {/* ========================================================= */}
      <TrophyArchive
        completedGoals={completedGoals}
        onAttachProof={(g) => setAttachProofGoal(g)}
      />

      {/* ========================================================= */}
      {/* 6. POP-UP MODAL SYSTEM                                    */}
      {/* ========================================================= */}

      {/* Create / Edit Goal Modal */}
      {createEditModal.open && (
        <CreateEditGoalModal
          goal={createEditModal.goal}
          onClose={() => setCreateEditModal({ open: false, goal: null })}
          onSave={handleSaveGoal}
        />
      )}

      {/* Log Progress Modal */}
      {logProgressGoal && (
        <LogProgressModal
          goal={logProgressGoal}
          onClose={() => setLogProgressGoal(null)}
          onSave={handleLogProgressSave}
        />
      )}

      {/* Attach Proof Modal */}
      {attachProofGoal && (
        <AttachProofModal
          goal={attachProofGoal}
          onClose={() => setAttachProofGoal(null)}
          onUploadSuccess={handleUpdateGoalFromModal}
        />
      )}

      {/* Celebration Toast / Dialog */}
      {celebrationGoal && (
        <CelebrationToast
          goal={celebrationGoal}
          onClose={() => setCelebrationGoal(null)}
        />
      )}
    </div>
  );
}
