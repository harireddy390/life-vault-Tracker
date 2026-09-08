import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  Search,
  Eye,
  Trash2,
  Download,
  Calendar,
  Building,
  FileSpreadsheet,
  FileCheck,
  ImageIcon,
  X,
  Plus,
} from 'lucide-react';
import { getRecordDownloadUrl } from '../../services/healthService';

const CATEGORIES = [
  { value: 'all', label: 'All Records' },
  { value: 'lab_report', label: 'Lab Reports' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'vaccine', label: 'Vaccinations' },
  { value: 'radiology', label: 'Radiology / Scans' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other Documents' },
];

export default function HealthRecords({
  records,
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onOpenUploadModal,
  onDeleteClick,
}) {
  const [previewRecord, setPreviewRecord] = useState(null);

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'lab_report':
        return <span className="h-tag text-blue-700 bg-blue-50 border-blue-200">Lab Report</span>;
      case 'prescription':
        return <span className="h-tag text-indigo-700 bg-indigo-50 border-indigo-200">Prescription</span>;
      case 'vaccine':
        return <span className="h-tag text-emerald-700 bg-emerald-50 border-emerald-200">Vaccination</span>;
      case 'radiology':
        return <span className="h-tag text-cyan-700 bg-cyan-50 border-cyan-200">Radiology</span>;
      case 'insurance':
        return <span className="h-tag text-amber-700 bg-amber-50 border-amber-200">Insurance</span>;
      default:
        return <span className="h-tag text-slate-700 bg-slate-100 border-slate-200">Medical File</span>;
    }
  };

  const getFileIcon = (mime) => {
    if (mime?.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-indigo-600" />;
    }
    return <FileText className="w-5 h-5 text-indigo-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Header with Vault-style primary button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-600" />
            Clinical Records & Diagnostic Vault
          </h3>
          <p className="text-xs text-slate-500">
            Encrypted repository for blood panels, radiology reports, and vaccination passports
          </p>
        </div>

        {/* Vault Popout Button */}
        <button
          type="button"
          onClick={onOpenUploadModal}
          className="group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-blue-500/60 text-slate-100 rounded-xl text-xs font-semibold shadow-lg shadow-slate-950/40 hover:brightness-110 hover:ring-2 hover:ring-blue-500/40 hover:translate-y-[-1px] active:scale-[0.98] transition-all duration-200 cursor-pointer self-start sm:self-auto"
        >
          <span className="w-5 h-5 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-all">
            <Plus className="w-3.5 h-3.5" />
          </span>
          <span>Upload Record</span>
        </button>
      </div>

      {/* Filter and Search Bar matching Vault controls bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Category Tabs matching Vault pill tabs */}
        <div className="h-category-tabs-container">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`h-category-tab-pill ${activeCategory === cat.value ? 'active' : ''}`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search input matching Vault search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            className="vault-search-input text-xs"
            placeholder="Search records or facility..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Records Grid */}
      {records && records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => (
            <div
              key={rec._id}
              className="h-card p-5 flex flex-col justify-between space-y-3 group hover:border-slate-300 transition-all duration-200"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      {getFileIcon(rec.mimeType)}
                    </div>
                    <div>
                      <h4
                        className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[180px]"
                        title={rec.title}
                      >
                        {rec.title}
                      </h4>
                      <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                        {rec.originalName}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteClick(rec)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(rec.recordDate).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {(rec.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  {rec.doctorOrFacility && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{rec.doctorOrFacility}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>{getCategoryBadge(rec.category)}</div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewRecord(rec)}
                    className="vault-btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 text-slate-700 hover:text-slate-900"
                    title="Inspect & View"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>View</span>
                  </button>

                  <a
                    href={getRecordDownloadUrl(rec._id)}
                    download={rec.originalName}
                    className="vault-btn-ghost text-xs py-1 px-2 text-slate-500 hover:text-slate-700"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-card p-8 text-center space-y-3 border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">No Records Found</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {searchQuery || activeCategory !== 'all'
                ? 'Try adjusting your search or category filter'
                : 'Upload medical history, diagnostic panels, or vaccination records'}
            </p>
          </div>
          <button onClick={onOpenUploadModal} className="vault-btn-primary mx-auto mt-2">
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Upload Document</span>
          </button>
        </div>
      )}

      {/* Inline Document Preview Modal (Matching Vault DocumentDetailModal style) */}
      {previewRecord && (
        <div className="h-modal-backdrop" onClick={() => setPreviewRecord(null)}>
          <div
            className="h-modal-card max-w-4xl h-[88vh] flex flex-col p-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0B1120]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-100 truncate block max-w-md">
                    {previewRecord.title}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {previewRecord.originalName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getRecordDownloadUrl(previewRecord._id)}
                  download={previewRecord.originalName}
                  className="modal-btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3 text-indigo-400" /> Download
                </a>
                <button
                  onClick={() => setPreviewRecord(null)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 p-2 overflow-auto flex items-center justify-center">
              {previewRecord.mimeType === 'application/pdf' ? (
                <iframe
                  src={getRecordDownloadUrl(previewRecord._id)}
                  className="w-full h-full rounded border-0"
                  title={previewRecord.title}
                />
              ) : (
                <img
                  src={getRecordDownloadUrl(previewRecord._id)}
                  alt={previewRecord.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
