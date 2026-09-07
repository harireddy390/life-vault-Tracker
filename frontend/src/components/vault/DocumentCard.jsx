import React from 'react';
import { Lock, FileText, Shield } from 'lucide-react';

export default function DocumentCard({ doc, onOpen }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="document-card bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="document-card-header flex items-center justify-between gap-2 mb-3">
          <span className="doc-category-chip bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium truncate">
            {doc.category}
          </span>

          {doc.isEncrypted ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-indigo-300 border border-slate-800">
              <Lock className="w-3 h-3" />
              <span>AES-256</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200/70">
              <Shield className="w-3 h-3 text-slate-400" />
              <span>Verified</span>
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="document-card-body mb-4">
          <div
            className={`doc-icon-wrapper w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${
              doc.isEncrypted
                ? 'doc-icon-encrypted bg-slate-900 text-indigo-400 border border-slate-800'
                : 'doc-icon-standard bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}
          >
            {doc.isEncrypted ? <Lock className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>

          <h3
            className="doc-card-title line-clamp-2 text-slate-900 font-semibold text-base mt-2"
            title={doc.name}
          >
            {doc.name}
          </h3>

          <p className="doc-card-meta text-xs text-slate-500 mt-1">
            {doc.size} • Uploaded {formatDate(doc.uploadDate)}
          </p>

          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="doc-tags-row flex flex-wrap gap-1.5 mt-2.5">
              {doc.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="doc-tag-pill bg-indigo-50/70 text-indigo-700 text-xs px-2 py-0.5 rounded-md font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Notes Snippet */}
          {doc.notes && (
            <p
              className="doc-notes-snippet text-xs text-slate-500 truncate mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100"
              title={doc.notes}
            >
              {doc.notes}
            </p>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="document-card-footer pt-3 border-t border-slate-100 flex items-center">
        {doc.isEncrypted ? (
          <button
            type="button"
            onClick={() => onOpen(doc)}
            className="btn-card-action encrypted w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Unlock & View</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(doc)}
            className="btn-card-action standard w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>View & Inspect</span>
          </button>
        )}
      </div>
    </div>
  );
}
