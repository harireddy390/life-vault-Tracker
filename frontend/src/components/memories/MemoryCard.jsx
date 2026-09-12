import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Star,
  MoreVertical,
  Edit3,
  Trash2,
  Image,
  Video,
  Music,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { getMediaSrc } from '../../services/memoryService';

const MOOD_EMOJI_MAP = {
  Joyful: '😊',
  Grateful: '🙏',
  Adventurous: '🗺️',
  Peaceful: '🌿',
  Nostalgic: '🕰️',
  Accomplished: '🏆',
};

export default function MemoryCard({
  memory,
  onOpenLightbox = () => {},
  onToggleFavorite = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onAddMedia = () => {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const mediaList = memory.media || [];
  const primaryMedia = mediaList[0];
  const secondaryMedia = mediaList.slice(1, 3);
  const remainingCount = mediaList.length > 3 ? mediaList.length - 3 : 0;

  const moodEmoji = MOOD_EMOJI_MAP[memory.mood] || '✨';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group relative">
      {/* Top Meta Bar */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mood pill */}
            {memory.mood && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                <span>{moodEmoji}</span>
                <span>{memory.mood}</span>
              </span>
            )}

            {/* Date */}
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(memory.memory_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>

            {/* Location */}
            {memory.location_name && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium truncate max-w-[150px]">
                <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <span className="truncate">{memory.location_name}</span>
              </span>
            )}
          </div>

          {/* Right Actions: Favorite + Options Menu */}
          <div className="flex items-center gap-1 relative flex-shrink-0">
            <button
              onClick={() => onToggleFavorite(memory._id)}
              className={`p-1.5 rounded-lg transition-all ${
                memory.is_favorite
                  ? 'text-amber-500 hover:text-amber-600 bg-amber-50'
                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
              }`}
              title={memory.is_favorite ? 'Favorited' : 'Mark as Favorite'}
              aria-label="Toggle favorite"
            >
              <Star
                className={`w-4 h-4 ${memory.is_favorite ? 'fill-amber-400 text-amber-500' : ''}`}
              />
            </button>

            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="More Options"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* In-context Dropdown Menu */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-30 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(memory);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    Edit Memory
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onAddMedia(memory);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                    Add Photos/Media
                  </button>
                  <hr className="my-1 border-slate-100" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(memory);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Memory
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-snug">
          {memory.title}
        </h3>

        {/* Story Text */}
        {memory.story_text && (
          <div className="mb-3">
            <p
              className={`text-xs sm:text-sm text-slate-600 leading-relaxed ${
                !expanded && memory.story_text.length > 140 ? 'line-clamp-2' : ''
              }`}
            >
              {memory.story_text}
            </p>
            {memory.story_text.length > 140 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 mt-1"
              >
                {expanded ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>
        )}

        {/* Media Layout Preview (Interactive Grid) */}
        {mediaList.length > 0 && (
          <div className="my-3">
            {mediaList.length === 1 ? (
              // Single full-width media preview
              <div
                onClick={() => onOpenLightbox(memory, 0)}
                className="relative rounded-xl overflow-hidden bg-slate-100 aspect-video max-h-64 cursor-pointer group/thumb border border-slate-200"
              >
                {primaryMedia.media_type === 'video' ? (
                  <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                    <video
                      src={getMediaSrc(primaryMedia)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg">
                        <Video className="w-6 h-6 ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : primaryMedia.media_type === 'audio' ? (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 p-4">
                    <Music className="w-8 h-8" />
                    <span className="text-xs font-semibold ml-2">Audio Note</span>
                  </div>
                ) : (
                  <img
                    src={getMediaSrc(primaryMedia)}
                    alt={memory.title}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                  <ExternalLink className="w-3 h-3" /> Click to Expand
                </div>
              </div>
            ) : (
              // Multi-item composite grid
              <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden max-h-48">
                {/* Large main photo */}
                <div
                  onClick={() => onOpenLightbox(memory, 0)}
                  className="col-span-2 relative aspect-4/3 bg-slate-100 cursor-pointer overflow-hidden group/thumb"
                >
                  <img
                    src={getMediaSrc(primaryMedia)}
                    alt={memory.title}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {primaryMedia.media_type === 'video' && (
                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-white p-1 rounded-md">
                      <Video className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Right stacked previews */}
                <div className="flex flex-col gap-1.5">
                  {secondaryMedia.map((m, idx) => {
                    const isLastVisible = idx === 1 && remainingCount > 0;
                    return (
                      <div
                        key={m._id || idx}
                        onClick={() => onOpenLightbox(memory, idx + 1)}
                        className="relative flex-1 aspect-square bg-slate-100 cursor-pointer overflow-hidden group/sub"
                      >
                        <img
                          src={getMediaSrc(m)}
                          alt={memory.title}
                          className="w-full h-full object-cover group-hover/sub:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {isLastVisible && (
                          <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center text-white font-bold text-sm">
                            +{remainingCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer: Tags & Media count */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 mt-2 text-xs">
        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(memory.tags || []).map((tag, idx) => (
            <span
              key={idx}
              className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md hover:bg-slate-200/80 transition-colors"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Media count pill */}
        {mediaList.length > 0 && (
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 flex-shrink-0">
            <Image className="w-3.5 h-3.5" />
            {mediaList.length} {mediaList.length === 1 ? 'file' : 'files'}
          </span>
        )}
      </div>
    </div>
  );
}
