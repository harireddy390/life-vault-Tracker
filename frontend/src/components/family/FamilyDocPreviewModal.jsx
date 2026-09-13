import React from 'react';
import { X, Download, FileText, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

export default function FamilyDocPreviewModal({
  isOpen,
  onClose,
  document: doc
}) {
  if (!isOpen || !doc) return null;

  const isPdf = doc.mime_type?.includes('pdf') || doc.file_name?.toLowerCase().endsWith('.pdf');
  const isImage = doc.mime_type?.includes('image') || /\.(jpg|jpeg|png|webp)$/i.test(doc.file_name);

  return (
    <div className="frosted-modal-overlay">
      <div className="frosted-modal-container max-w-4xl h-[85vh] flex flex-col bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-md" title={doc.file_name}>
                {doc.file_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                <span className="capitalize">{doc.document_type?.replace(/_/g, ' ')}</span>
                {doc.document_number && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-600">#{doc.document_number}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={doc.file_url}
              download={doc.file_name}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-50 overflow-auto flex items-center justify-center p-4 relative">
          {isPdf ? (
            <iframe
              src={doc.file_url}
              title={doc.file_name}
              className="w-full h-full rounded-lg border border-slate-200 bg-white"
            />
          ) : isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={doc.file_url}
                alt={doc.file_name}
                className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <div className="text-center p-8 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-800">File preview not supported inline</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This file format cannot be displayed directly in the browser viewer.
              </p>
              <a
                href={doc.file_url}
                download={doc.file_name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer Notes if any */}
        {doc.notes && (
          <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 shrink-0">
            <span className="font-semibold text-slate-800">Document Note: </span>
            <span>{doc.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
