import React, { useState, useEffect, useCallback } from 'react';
import memoryService from '../services/memoryService';
import Toast from '../components/Toast';
import ThrowbackBanner from '../components/memories/ThrowbackBanner';
import MemoryStatsBar from '../components/memories/MemoryStatsBar';
import TimelineRail from '../components/memories/TimelineRail';
import MemoryCard from '../components/memories/MemoryCard';
import LockedCapsuleCard from '../components/memories/LockedCapsuleCard';
import MemoryModal from '../components/memories/MemoryModal';
import MemoryLightboxModal from '../components/memories/MemoryLightboxModal';
import MemoryDeleteModal from '../components/memories/MemoryDeleteModal';
import { Camera, Calendar, Sparkles, RefreshCw, Plus } from 'lucide-react';
import './Memories.css';

export default function Memories() {
  const [timeline, setTimeline] = useState([]);
  const [throwbacks, setThrowbacks] = useState([]);
  const [stats, setStats] = useState({
    total_memories: 0,
    total_media: 0,
    years_chronicled: 0,
    locked_capsules: 0,
    favorite_memories: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [activeMood, setActiveMood] = useState('');
  const [activeYear, setActiveYear] = useState('');
  const [activeFavoriteOnly, setActiveFavoriteOnly] = useState(false);

  // Modals state
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [isTimeCapsuleMode, setIsTimeCapsuleMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMemory, setLightboxMemory] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all timeline & stats data
  const loadData = useCallback(async () => {
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (activeTag) params.tag = activeTag;
      if (activeMood) params.mood = activeMood;
      if (activeYear) params.year = activeYear;
      if (activeFavoriteOnly) params.favorite = 'true';

      const [timelineData, throwbacksData, statsData] = await Promise.all([
        memoryService.getTimeline(params),
        memoryService.getThrowbacks(),
        memoryService.getStats(),
      ]);

      setTimeline(timelineData || []);
      setThrowbacks(throwbacksData || []);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to load memories:', err);
      showToast('Could not load memories. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTag, activeMood, activeYear, activeFavoriteOnly]);

  // Debounced search / filter reload
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Handle Favorite Toggle
  const handleToggleFavorite = async (memoryId) => {
    // Optimistic UI update across timeline
    setTimeline((prevTimeline) =>
      prevTimeline.map((yearGroup) => ({
        ...yearGroup,
        months: yearGroup.months.map((monthGroup) => ({
          ...monthGroup,
          memories: monthGroup.memories.map((m) =>
            m._id === memoryId ? { ...m, is_favorite: !m.is_favorite } : m
          ),
        })),
      }))
    );

    try {
      const updated = await memoryService.toggleFavorite(memoryId);
      showToast(updated.is_favorite ? 'Added to favorites' : 'Removed from favorites');
      // Refresh stats in background
      memoryService.getStats().then((s) => s && setStats(s));
    } catch (err) {
      console.error('Toggle favorite failed:', err);
      showToast('Failed to update favorite status', 'error');
      loadData(); // Revert
    }
  };

  // Handle Create / Edit Submit
  const handleSaveMemory = async (formData, memoryId) => {
    setIsSubmitting(true);
    try {
      if (memoryId) {
        await memoryService.updateMemory(memoryId, formData);
        showToast('Memory updated successfully.');
      } else {
        await memoryService.createMemory(formData);
        showToast(
          isTimeCapsuleMode ? 'Digital time capsule sealed securely.' : 'New memory chronicled.'
        );
      }
      setMemoryModalOpen(false);
      setSelectedMemory(null);
      setIsTimeCapsuleMode(false);
      await loadData();
    } catch (err) {
      console.error('Save memory error:', err);
      showToast(err.response?.data?.message || 'Could not save memory.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Media from inside Edit Modal
  const handleDeleteExistingMedia = async (memoryId, mediaId) => {
    try {
      const updated = await memoryService.deleteMedia(memoryId, mediaId);
      setSelectedMemory(updated);
      showToast('Media file removed.');
      loadData();
    } catch (err) {
      console.error('Delete media error:', err);
      showToast('Could not delete media file.', 'error');
    }
  };

  // Handle Memory Delete
  const handleConfirmDelete = async (memoryId) => {
    setIsDeleting(true);
    try {
      await memoryService.deleteMemory(memoryId);
      showToast('Memory permanently deleted.');
      setDeleteModalOpen(false);
      setMemoryToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Delete memory error:', err);
      showToast('Failed to delete memory.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Lightbox Triggers
  const openLightbox = (memory, index = 0) => {
    setLightboxMemory(memory);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Extract all available years from timeline
  const availableYears = timeline.map((t) => t.year).sort((a, b) => b - a);

  // Total count of matching memories in current view
  const totalVisibleMemories = timeline.reduce(
    (acc, y) => acc + y.months.reduce((mAcc, m) => mAcc + m.memories.length, 0),
    0
  );

  return (
    <div className="memories-page bg-slate-50 min-h-screen">
      <Toast message={toast?.message} type={toast?.type} />

      {/* Throwback Banner: "On This Day" */}
      {throwbacks.length > 0 && (
        <ThrowbackBanner
          throwbacks={throwbacks}
          onViewMemory={(mem) => {
            if (mem.media && mem.media.length > 0) {
              openLightbox(mem, 0);
            } else {
              setSelectedMemory(mem);
              setMemoryModalOpen(true);
            }
          }}
        />
      )}

      {/* Stats KPI Bar & Action Triggers */}
      <MemoryStatsBar
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateMemory={() => {
          setSelectedMemory(null);
          setIsTimeCapsuleMode(false);
          setMemoryModalOpen(true);
        }}
        onCreateTimeCapsule={() => {
          setSelectedMemory(null);
          setIsTimeCapsuleMode(true);
          setMemoryModalOpen(true);
        }}
        activeFavoriteOnly={activeFavoriteOnly}
        onToggleFavorites={setActiveFavoriteOnly}
      />

      {/* Tags, Moods & Year Navigation Rail */}
      <TimelineRail
        activeTag={activeTag}
        onSelectTag={setActiveTag}
        activeMood={activeMood}
        onSelectMood={setActiveMood}
        availableYears={availableYears}
        activeYear={activeYear}
        onSelectYear={setActiveYear}
      />

      {/* Main Timeline Stream */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-slate-600">Loading your memories...</p>
        </div>
      ) : totalVisibleMemories === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs my-8 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {searchQuery || activeTag || activeMood || activeFavoriteOnly
              ? 'No matching memories found'
              : 'Your Life Story Starts Here'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            {searchQuery || activeTag || activeMood || activeFavoriteOnly
              ? 'Try clearing your search query or tag filters to see all chronicled memories.'
              : 'Capture special milestones, vacations, personal reflections, or seal a digital time capsule for the future.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            {searchQuery || activeTag || activeMood || activeFavoriteOnly ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTag('');
                  setActiveMood('');
                  setActiveYear('');
                  setActiveFavoriteOnly(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedMemory(null);
                  setIsTimeCapsuleMode(false);
                  setMemoryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                Capture First Memory
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {timeline.map((yearGroup) => (
            <div key={yearGroup.year} className="space-y-6">
              {/* Year Section Divider */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl shadow-xs">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-extrabold tracking-wide">{yearGroup.year}</span>
                </div>
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-xs font-semibold text-slate-400">
                  {yearGroup.count} {yearGroup.count === 1 ? 'memory' : 'memories'}
                </span>
              </div>

              {/* Month Groups within Year */}
              {yearGroup.months.map((monthGroup) => (
                <div key={monthGroup.month} className="space-y-3">
                  {/* Month Subheading */}
                  <div className="flex items-center gap-2 pl-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {monthGroup.month}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      ({monthGroup.count})
                    </span>
                  </div>

                  {/* Grid of Memories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {monthGroup.memories.map((m) => {
                      if (m.is_locked) {
                        return (
                          <LockedCapsuleCard
                            key={m._id}
                            memory={m}
                            onEdit={(mem) => {
                              setSelectedMemory(mem);
                              setIsTimeCapsuleMode(true);
                              setMemoryModalOpen(true);
                            }}
                            onDelete={(mem) => {
                              setMemoryToDelete(mem);
                              setDeleteModalOpen(true);
                            }}
                          />
                        );
                      }

                      return (
                        <MemoryCard
                          key={m._id}
                          memory={m}
                          onOpenLightbox={openLightbox}
                          onToggleFavorite={handleToggleFavorite}
                          onEdit={(mem) => {
                            setSelectedMemory(mem);
                            setIsTimeCapsuleMode(false);
                            setMemoryModalOpen(true);
                          }}
                          onDelete={(mem) => {
                            setMemoryToDelete(mem);
                            setDeleteModalOpen(true);
                          }}
                          onAddMedia={(mem) => {
                            setSelectedMemory(mem);
                            setIsTimeCapsuleMode(false);
                            setMemoryModalOpen(true);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* In-Context Modals (Strictly Zero Page Redirects) */}
      <MemoryModal
        isOpen={memoryModalOpen}
        onClose={() => {
          setMemoryModalOpen(false);
          setSelectedMemory(null);
          setIsTimeCapsuleMode(false);
        }}
        onSubmit={handleSaveMemory}
        memory={selectedMemory}
        initialTimeCapsule={isTimeCapsuleMode}
        isSubmitting={isSubmitting}
        onDeleteExistingMedia={handleDeleteExistingMedia}
      />

      <MemoryLightboxModal
        isOpen={lightboxOpen}
        onClose={() => {
          setLightboxOpen(false);
          setLightboxMemory(null);
        }}
        memory={lightboxMemory}
        initialIndex={lightboxIndex}
      />

      <MemoryDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setMemoryToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        memory={memoryToDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
