import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
  Video,
  Music,
} from 'lucide-react';
import { getMediaSrc } from '../../services/memoryService';

export default function MemoryLightboxModal({
  isOpen,
  onClose,
  memory = null,
  initialIndex = 0,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const mediaList = memory?.media || [];
  const currentMedia = mediaList[currentIndex];

  const handleNext = useCallback(() => {
    if (mediaList.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % mediaList.length);
    }
  }, [mediaList.length]);

  const handlePrev = useCallback(() => {
    if (mediaList.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
    }
  }, [mediaList.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || !memory || !currentMedia) return null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-150">
      {/* Top Controls Bar */}
      <div className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between text-white border-b border-slate-800/80 bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              {memory.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(memory.memory_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {memory.location_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  {memory.location_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          {mediaList.length > 1 && (
            <span className="text-xs font-semibold bg-slate-800 px-2.5 py-1 rounded-full text-slate-300 mr-2">
              {currentIndex + 1} / {mediaList.length}
            </span>
          )}

          <a
            href={getMediaSrc(currentMedia)}
            download={currentMedia.file_name || currentMedia.original_name || currentMedia.originalName || 'memory-media'}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Download / Open Original"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors hidden sm:block"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport & Side Arrows */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 min-h-0 overflow-hidden">
        {/* Previous Button */}
        {mediaList.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 z-10 p-2 sm:p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white shadow-lg transition-transform active:scale-95"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Media Container */}
        <div className="max-w-5xl max-h-full flex items-center justify-center">
          {currentMedia.media_type === 'video' ? (
            <video
              key={currentMedia._id || currentMedia.file_url || currentMedia.storedName}
              src={getMediaSrc(currentMedia)}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-lg shadow-2xl object-contain"
            />
          ) : currentMedia.media_type === 'audio' ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Music className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-white mb-3">
                {currentMedia.file_name || currentMedia.original_name || currentMedia.originalName || 'Audio Recording'}
              </p>
              <audio
                controls
                src={getMediaSrc(currentMedia)}
                className="w-72 sm:w-96"
              />
            </div>
          ) : (
            <img
              key={currentMedia._id || currentMedia.file_url || currentMedia.storedName}
              src={getMediaSrc(currentMedia)}
              alt={memory.title}
              className="max-h-[75vh] max-w-full rounded-lg shadow-2xl object-contain transition-all"
            />
          )}
        </div>

        {/* Next Button */}
        {mediaList.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-3 sm:right-6 z-10 p-2 sm:p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white shadow-lg transition-transform active:scale-95"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Filmstrip & Story Excerpt */}
      <div className="w-full border-t border-slate-800/80 bg-slate-950/70 p-3 shrink-0 flex flex-col items-center gap-2">
        {/* Caption text */}
        {memory.story_text && (
          <p className="text-xs text-slate-300 max-w-3xl text-center line-clamp-2 px-4">
            {memory.story_text}
          </p>
        )}

        {/* Thumbnails Filmstrip */}
        {mediaList.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-xl scrollbar-thin scrollbar-thumb-slate-800">
            {mediaList.map((m, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={m._id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/30'
                      : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  {m.media_type === 'image' ? (
                    <img
                      src={getMediaSrc(m)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                      {m.media_type === 'video' ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <Music className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
