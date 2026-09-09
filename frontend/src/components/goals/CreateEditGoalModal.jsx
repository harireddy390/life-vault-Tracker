import { useState } from 'react';
import {
  X,
  Target,
  Plus,
  Trash2,
  Calendar,
  Flag,
  Sparkles,
  DollarSign,
  Briefcase,
  HeartPulse,
  Compass,
  Layers,
  TrendingUp,
  ListChecks,
  Flame,
  Tag,
  CheckCircle2,
  Circle,
  HelpCircle,
} from 'lucide-react';

const CATEGORIES = [
  {
    id: 'Finance',
    label: 'Finance',
    icon: DollarSign,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-100',
  },
  {
    id: 'Career',
    label: 'Career',
    icon: Briefcase,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-100',
  },
  {
    id: 'Health_Fitness',
    label: 'Health & Fitness',
    icon: HeartPulse,
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50 border-teal-100',
  },
  {
    id: 'Personal_Development',
    label: 'Personal Dev',
    icon: Sparkles,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50 border-violet-100',
  },
  {
    id: 'Travel',
    label: 'Travel',
    icon: Compass,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-100',
  },
  {
    id: 'Other',
    label: 'Other',
    icon: Layers,
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100 border-slate-200',
  },
];

const GOAL_TYPES = [
  {
    id: 'numeric',
    label: 'Numeric Target',
    desc: 'Track numbers (savings, kg weight, books read)',
    icon: TrendingUp,
    badgeBg: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    id: 'milestone',
    label: 'Milestone Checklist',
    desc: 'Sequential steps to check off one by one',
    icon: ListChecks,
    badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    id: 'habit_streak',
    label: 'Habit Streak',
    desc: 'Track consecutive days of habit consistency',
    icon: Flame,
    badgeBg: 'bg-amber-50 text-amber-600 border-amber-200',
  },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-slate-400', activeStyle: 'border-slate-400 bg-slate-50 text-slate-800' },
  { id: 'medium', label: 'Medium', color: 'bg-amber-500', activeStyle: 'border-amber-500 bg-amber-50 text-amber-800' },
  { id: 'high', label: 'High', color: 'bg-rose-500', activeStyle: 'border-rose-500 bg-rose-50 text-rose-800' },
];

export default function CreateEditGoalModal({ goal, onClose, onSave }) {
  const isEdit = Boolean(goal?._id || goal?.id);

  const getDefaultDate = () => {
    if (goal?.target_date) return new Date(goal.target_date).toISOString().split('T')[0];
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [category, setCategory] = useState(goal?.category || 'Personal_Development');
  const [goalType, setGoalType] = useState(goal?.goal_type || 'numeric');
  const [targetDate, setTargetDate] = useState(getDefaultDate());
  const [targetValue, setTargetValue] = useState(goal?.target_value ?? goal?.targetValue ?? 100);
  const [currentValue, setCurrentValue] = useState(goal?.current_value ?? goal?.currentValue ?? 0);
  const [unit, setUnit] = useState(goal?.unit || '%');
  const [priority, setPriority] = useState(goal?.priority || 'medium');
  const [milestones, setMilestones] = useState(
    goal?.milestones?.map((m) => (typeof m === 'string' ? m : m.title)) || []
  );
  const [newMilestoneInput, setNewMilestoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddMilestone = () => {
    if (!newMilestoneInput.trim()) return;
    setMilestones([...milestones, newMilestoneInput.trim()]);
    setNewMilestoneInput('');
  };

  const handleRemoveMilestone = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a goal title.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      goal_type: goalType,
      target_date: targetDate,
      target_value: Number(targetValue) || 100,
      current_value: Number(currentValue) || 0,
      unit: unit.trim() || '%',
      priority,
      milestones,
    };

    try {
      await onSave(payload, goal?._id || goal?.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save goal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/45 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 shadow-sm">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {isEdit ? 'Edit Goal' : 'Establish New Goal'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define metrics, deadlines, and milestone checkpoints.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs shrink-0 flex items-center gap-2">
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <form id="goal-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Goal Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Goal Title <span className="text-indigo-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Target size={16} />
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Run a Marathon, Save $15,000, Read 24 Books"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                required
              />
            </div>
          </div>

          {/* 2. Category Boxes (Icon Badges & Cards) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {CATEGORIES.map((c) => {
                const IconComponent = c.icon;
                const isSelected = category === c.id;

                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center mb-1.5 transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : `${c.iconBg} ${c.iconColor}`
                      }`}
                    >
                      <IconComponent size={16} />
                    </div>
                    <span
                      className={`text-xs font-medium truncate w-full ${
                        isSelected ? 'text-indigo-950 font-bold' : 'text-slate-700'
                      }`}
                    >
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Tracking Mechanism (Goal Type Radio Boxes with Icons) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Tracking Mechanism
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {GOAL_TYPES.map((t) => {
                const IconComp = t.icon;
                const isSelected = goalType === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setGoalType(t.id);
                      if (t.id === 'milestone') setUnit('steps');
                    }}
                    className={`cursor-pointer p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : t.badgeBg
                        }`}
                      >
                        <IconComp size={16} />
                      </div>
                      <div className="pt-0.5">
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isSelected ? 'text-indigo-950' : 'text-slate-800'
                        }`}
                      >
                        {t.label}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-1">
                        {t.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Metric Value Boxes */}
          {goalType !== 'milestone' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Target Value */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Target Value <span className="text-indigo-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Target size={15} />
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="100"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 text-sm font-semibold focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                    required
                  />
                </div>
              </div>

              {/* Current Value */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Starting Progress
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <TrendingUp size={15} />
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 text-sm font-semibold focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>

              {/* Metric Unit */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Metric Unit
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Tag size={15} />
                  </div>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="$, books, kg, %"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 text-sm font-semibold focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5">
              <ListChecks size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-indigo-950">Milestone Checklist Mode</span>
                Your overall target value will automatically equal the number of checklist items you add below.
              </div>
            </div>
          )}

          {/* 5. Deadline & Priority Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Deadline */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Target Deadline <span className="text-indigo-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 pointer-events-none">
                  <Calendar size={15} />
                </div>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 text-sm font-semibold focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  required
                />
              </div>
            </div>

            {/* Priority Selectable Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => {
                  const isSelected = priority === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setPriority(p.id)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? `${p.activeStyle} shadow-sm border-2 font-bold`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${p.color}`} />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 6. Description Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Description & Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this goal matters, key strategies, or motivation..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition resize-none"
            />
          </div>

          {/* 7. Sub-Milestones Checklist Box */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Sub-Milestone Steps ({milestones.length})
              </label>
              <span className="text-[11px] text-slate-400">Add checkpoints to conquer</span>
            </div>

            {milestones.length > 0 && (
              <div className="space-y-2 mb-3">
                {milestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 shadow-2xs"
                  >
                    <span className="truncate flex items-center gap-2.5 font-medium">
                      <span className="w-5 h-5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {m}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition cursor-pointer"
                      title="Remove milestone"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <ListChecks size={15} />
                </div>
                <input
                  type="text"
                  value={newMilestoneInput}
                  onChange={(e) => setNewMilestoneInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMilestone();
                    }
                  }}
                  placeholder="e.g. Complete chapter 1, Open high-yield account..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50/70 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer shadow-2xs"
              >
                <Plus size={14} /> Add Step
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="goal-form"
            disabled={loading}
            className="vault-btn-primary"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Goal' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}
