import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Video,
  Music,
  Trash2,
  Calendar,
  MapPin,
  Smile,
  Lock,
  Star,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { getMediaSrc } from '../../services/memoryService';

const MOODS = [
  { value: 'Joyful', label: 'Joyful', emoji: '😊' },
  { value: 'Grateful', label: 'Grateful', emoji: '🙏' },
  { value: 'Adventurous', label: 'Adventurous', emoji: '🗺️' },
  { value: 'Peaceful', label: 'Peaceful', emoji: '🌿' },
  { value: 'Nostalgic', label: 'Nostalgic', emoji: '🕰️' },
  { value: 'Accomplished', label: 'Accomplished', emoji: '🏆' },
];

export default function MemoryModal({
  isOpen,
  onClose,
  onSubmit,
  memory = null, // null for create, object for edit
  initialTimeCapsule = false,
  isSubmitting = false,
  onDeleteExistingMedia = null,
}) {
  const [title, setTitle] = useState('');
  const [memoryDate, setMemoryDate] = useState('');
  const [storyText, setStoryText] = useState('');
  const [mood, setMood] = useState('Joyful');
  const [locationName, setLocationName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCapsule, setIsCapsule] = useState(false);
  const [lockUntilDate, setLockUntilDate] = useState('');
  const [newFiles, setNewFiles] = useState([]);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (memory) {
        setTitle(memory.title || '');
        const rawDate = memory.memory_date || memory.date;
        setMemoryDate(rawDate ? new Date(rawDate).toISOString().split('T')[0] : '');
        setStoryText(memory.story_text || memory.description || '');
        setMood(memory.mood || 'Joyful');
        setLocationName(memory.location_name || '');
        setTagsInput((memory.tags || []).join(', '));
        setIsFavorite(!!memory.is_favorite);
        if (memory.lock_until_date && new Date(memory.lock_until_date) > new Date()) {
          setIsCapsule(true);
          setLockUntilDate(new Date(memory.lock_until_date).toISOString().split('T')[0]);
        } else {
          setIsCapsule(false);
          setLockUntilDate('');
        }
      } else {
        // Create new memory
        setTitle('');
        setMemoryDate(new Date().toISOString().split('T')[0]);
        setStoryText('');
        setMood('Joyful');
        setLocationName('');
        setTagsInput('');
        setIsFavorite(false);
        if (initialTimeCapsule) {
          setIsCapsule(true);
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          setLockUntilDate(nextYear.toISOString().split('T')[0]);
        } else {
          setIsCapsule(false);
          setLockUntilDate('');
        }
      }
      setNewFiles([]);
      setError('');
    }
  }, [isOpen, memory, initialTimeCapsule]);

  if (!isOpen) return null;

  const handleFiles = (fileList) => {
    setError('');
    const incoming = Array.from(fileList);
    const existingCount = (memory?.media?.length || 0) + newFiles.length;
    if (existingCount + incoming.length > 10) {
      setError('You can attach a maximum of 10 media files per memory.');
      return;
    }

    const invalid = incoming.find((f) => f.size > 50 * 1024 * 1024);
    if (invalid) {
      setError(`File "${invalid.name}" exceeds the 50MB file size limit.`);
      return;
    }

    const newObjFiles = incoming.map((f) => ({
      file: f,
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1),
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      type: f.type.startsWith('image/')
        ? 'image'
        : f.type.startsWith('video/')
        ? 'video'
        : f.type.startsWith('audio/')
        ? 'audio'
        : 'file',
    }));

    setNewFiles((prev) => [...prev, ...newObjFiles]);
  };

  const removeNewFile = (idx) => {
    setNewFiles((prev) => {
      const target = prev[idx];
      if (target.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this memory.');
      return;
    }
    if (!memoryDate) {
      setError('Please provide the date when this memory happened.');
      return;
    }
    if (isCapsule && !lockUntilDate) {
      setError('Please select an unlock date for the time capsule.');
      return;
    }
    if (isCapsule && new Date(lockUntilDate) <= new Date()) {
      setError('Time capsule unlock date must be in the future.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('memory_date', memoryDate);
    formData.append('date', memoryDate); // legacy fallback
    formData.append('story_text', storyText.trim());
    formData.append('description', storyText.trim()); // legacy fallback
    formData.append('mood', mood);
    formData.append('location_name', locationName.trim());
    formData.append('tags', JSON.stringify(tags));
    formData.append('is_favorite', isFavorite);
    if (isCapsule && lockUntilDate) {
      formData.append('lock_until_date', new Date(lockUntilDate).toISOString());
    } else {
      formData.append('lock_until_date', '');
    }

    newFiles.forEach((item) => {
      formData.append('files', item.file);
    });

    onSubmit(formData, memory?._id);
  };

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-2xl flex flex-col max-h-[92vh] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header with normal light colors */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <ImageIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {memory ? 'Edit Memory' : isCapsule ? 'Seal Digital Time Capsule' : 'Capture New Memory'}
              </h3>
              <p className="text-xs text-slate-500">
                Life milestone, travel photo album, or future sealed letter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with normal light background */}
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-4.5 flex-1 scrollbar-thin bg-white"
        >
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Title & Favorite */}
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Memory Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Summit of Mt. Rainier, Graduation Day"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
                required
              />
            </div>

            <div className="pt-5">
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all ${
                  isFavorite
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Mark as Favorite"
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Favorite</span>
              </button>
            </div>
          </div>

          {/* Date & Location Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date of Memory <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={memoryDate}
                onChange={(e) => setMemoryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Maui, Hawaii"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Mood Selector Row */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Emotional Tone / Mood
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {MOODS.map((m) => {
                const isSelected = mood === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs border transition-all ${
                      isSelected
                        ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base mb-0.5">{m.emoji}</span>
                    <span className="text-[11px] truncate w-full text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Story Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Story / Journal Narrative
            </label>
            <textarea
              rows={3}
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="What made this moment unforgettable? The sights, thoughts, or conversations..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Travel, Family, Milestone, Birthday"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
            />
          </div>

          {/* Digital Time Capsule Toggle */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Seal as Digital Time Capsule</p>
                  <p className="text-[11px] text-slate-600">
                    Encrypts and hides story text and photos until a future date.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isCapsule}
                onChange={(e) => {
                  setIsCapsule(e.target.checked);
                  if (e.target.checked && !lockUntilDate) {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    setLockUntilDate(d.toISOString().split('T')[0]);
                  }
                }}
                className="w-4 h-4 rounded-sm border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            {isCapsule && (
              <div className="pt-2.5 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs text-amber-900 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Unlock Date:
                </label>
                <input
                  type="date"
                  value={lockUntilDate}
                  onChange={(e) => setLockUntilDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  required={isCapsule}
                />
              </div>
            )}
          </div>

          {/* Media Attachments Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Photos, Videos &amp; Audio Attachments (Up to 10 files, max 50MB each)
            </label>

            {/* Existing media previews in edit mode */}
            {memory?.media && memory.media.length > 0 && (
              <div className="mb-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500">Existing Media:</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {memory.media.map((m) => (
                    <div
                      key={m._id}
                      className="relative rounded-xl overflow-hidden aspect-square bg-slate-100 border border-slate-200 group shadow-2xs"
                    >
                      {m.media_type === 'image' ? (
                        <img
                          src={getMediaSrc(m)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          {m.media_type === 'video' ? (
                            <Video className="w-5 h-5 text-sky-600" />
                          ) : (
                            <Music className="w-5 h-5 text-indigo-600" />
                          )}
                        </div>
                      )}
                      {onDeleteExistingMedia && (
                        <button
                          type="button"
                          onClick={() => onDeleteExistingMedia(memory._id, m._id)}
                          className="absolute inset-0 bg-rose-950/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove media"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drag & Drop Dropzone with light background */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50/80'
                  : 'border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-100/60'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">
                Click to browse or drag &amp; drop files here
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                PNG, JPG, WEBP, MP4, MOV, MP3 up to 50MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Staged new file previews */}
            {newFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
                {newFiles.map((nf, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-xl overflow-hidden aspect-square bg-slate-100 border border-slate-200 group shadow-2xs"
                  >
                    {nf.preview ? (
                      <img src={nf.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-1 text-center">
                        {nf.type === 'video' ? (
                          <Video className="w-5 h-5 text-sky-600" />
                        ) : (
                          <Music className="w-5 h-5 text-indigo-600" />
                        )}
                        <span className="text-[9px] truncate max-w-full px-1 mt-1 text-slate-600 font-medium">
                          {nf.name}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeNewFile(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving Memory...</span>
              ) : memory ? (
                'Save Changes'
              ) : isCapsule ? (
                'Seal Time Capsule'
              ) : (
                'Save Memory'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
