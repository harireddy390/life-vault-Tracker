import { useEffect, useRef, useState } from 'react';
import memoryService from '../services/memoryService';

export default function MemoryMedia({ memoryId, media, onDelete }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const activeUrlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const objUrl = await memoryService.getMediaUrl(memoryId, media._id);
        if (cancelled) { window.URL.revokeObjectURL(objUrl); return; }
        activeUrlRef.current = objUrl;
        setUrl(objUrl);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [memoryId, media._id]);

  useEffect(() => {
    return () => { if (activeUrlRef.current) window.URL.revokeObjectURL(activeUrlRef.current); };
  }, []);

  return (
    <div className="memory-media-item">
      {loading ? (
        <div className="memory-media-loading"><span className="spinner"></span></div>
      ) : media.mimeType.startsWith('video/') ? (
        <video src={url} controls className="memory-media-video" />
      ) : (
        <img src={url} alt={media.originalName} className="memory-media-image" />
      )}
      {onDelete && (
        <button className="memory-media-delete" onClick={() => onDelete(media._id)} aria-label="Remove media">
          &times;
        </button>
      )}
    </div>
  );
}
