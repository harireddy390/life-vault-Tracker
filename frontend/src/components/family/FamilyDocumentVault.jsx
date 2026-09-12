import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Search, 
  Eye, 
  Download, 
  Trash2, 
  FileCheck, 
  Shield, 
  FolderLock,
  HeartPulse,
  GraduationCap,
  FileBadge
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All', icon: FolderLock },
  { id: 'Government_ID', label: 'Government ID', icon: Shield },
  { id: 'Medical_Record', label: 'Medical', icon: HeartPulse },
  { id: 'Insurance_Card', label: 'Insurance', icon: FileBadge },
  { id: 'Education', label: 'Education', icon: GraduationCap },
  { id: 'Other', label: 'Other', icon: FileText }
];

export default function FamilyDocumentVault({
  documents = [],
  selectedMember,
  onOpenUploadDoc,
  onPreviewDoc,
  onDeleteDoc
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'ALL' || doc.document_type === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (doc.file_name && doc.file_name.toLowerCase().includes(q)) ||
      (doc.document_number && doc.document_number.toLowerCase().includes(q)) ||
      (doc.notes && doc.notes.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadgeClass = (type) => {
    switch (type) {
      case 'Government_ID':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Medical_Record':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Insurance_Card':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Education':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatCategoryLabel = (type) => {
    const found = CATEGORIES.find((c) => c.id === type);
    return found ? found.label : type ? type.replace(/_/g, ' ') : 'General';
  };

  return (
    <div className="fam-card overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {selectedMember ? `${selectedMember.full_name}'s Vault Documents` : 'Member Documents'}
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {documents.length} Files
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Isolated personal records, identification copies, and certificates.
          </p>
        </div>

        <button
          onClick={onOpenUploadDoc}
          disabled={!selectedMember}
          className="vault-btn-action text-xs py-1.5 px-3"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter and Search rail */}
      <div className="px-4 py-2.5 bg-slate-50/30 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-48">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Documents Grid / Empty state */}
      <div className="p-4">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5 border border-indigo-100">
              <FileCheck className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No Documents Found</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 mb-3">
              {documents.length === 0
                ? 'No documents uploaded for this member yet. Upload passports, IDs, or immunization records.'
                : 'No documents match the active filter or search keywords.'}
            </p>
            {selectedMember && documents.length === 0 && (
              <button
                onClick={onOpenUploadDoc}
                className="vault-btn-action text-xs py-1.5 px-3 mx-auto"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload First Document</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDocs.map((doc) => {
              return (
                <div
                  key={doc._id}
                  className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-sm transition-all group flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[200px] cursor-pointer"
                          onClick={() => onPreviewDoc(doc)}
                          title={doc.file_name}
                        >
                          {doc.file_name}
                        </h4>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getCategoryBadgeClass(
                            doc.document_type
                          )}`}
                        >
                          {formatCategoryLabel(doc.document_type)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 flex-wrap">
                        {doc.document_number && (
                          <span className="text-slate-600 font-mono">#{doc.document_number}</span>
                        )}
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size_bytes)}</span>
                        <span>•</span>
                        <span>
                          {new Date(doc.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onPreviewDoc(doc)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Quick In-context Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={doc.file_url}
                      download={doc.file_name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => onDeleteDoc(doc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
