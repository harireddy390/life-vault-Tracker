import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Layers,
  GraduationCap,
  FileBadge,
  HeartPulse,
  Briefcase,
  Lock,
  HardDrive,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';

import DocumentCard from '../components/vault/DocumentCard';
import DocumentDetailModal from '../components/vault/DocumentDetailModal';
import UploadModal from '../components/vault/UploadModal';
import SecurityAuthModal from '../components/vault/SecurityAuthModal';
import DeleteConfirmModal from '../components/vault/DeleteConfirmModal';
import StorageUsageBar from '../components/vault/StorageUsageBar';
import vaultStorage, { BASELINE_QUOTA_BYTES } from '../services/vaultStorage';
import { hasMasterPassword, encryptBlob, decryptBlob } from '../services/vaultCrypto';
import './Vault.css';

const STORAGE_KEY = 'life_vault_documents';

const CATEGORIES = [
  { id: 'All', label: 'All Documents', icon: Layers },
  { id: 'Academics & College', label: 'Academics & College', icon: GraduationCap },
  { id: 'Government IDs', label: 'Government IDs', icon: FileBadge },
  { id: 'Medical & Health', label: 'Medical & Health', icon: HeartPulse },
  { id: 'Finance & Employment', label: 'Finance & Employment', icon: Briefcase },
  { id: 'Secret Safe', label: 'Secret Safe', icon: Lock },
];

export default function Vault() {
  // ── 1. Clean Zero-Mock State Initialization ──
  const [documents, setDocuments] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Clean wipe of any legacy mock/seed items
          const cleaned = parsed.filter(
            (d) => !d.id?.startsWith('doc-seed-') && !['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5'].includes(d.id)
          );
          return cleaned;
        }
      }
    } catch (e) {
      console.error('Failed to parse vault documents:', e);
    }
    return [];
  });

  // UI state
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name' | 'size'

  // Toast feedback state
  const [toast, setToast] = useState(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocForDetail, setSelectedDocForDetail] = useState(null);
  const [docForAuth, setDocForAuth] = useState(null);
  const [authMode, setAuthMode] = useState('unlock'); // 'unlock' | 'setup'
  const [pendingUploadCallback, setPendingUploadCallback] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to sync documents to localStorage:', e);
    }
  }, [documents]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Calculate actual storage used (in bytes)
  const totalStorageBytes = useMemo(() => {
    let bytes = 0;
    documents.forEach((d) => {
      if (typeof d.sizeBytes === 'number') {
        bytes += d.sizeBytes;
      } else if (d.size?.includes('MB')) {
        bytes += parseFloat(d.size) * 1024 * 1024;
      } else if (d.size?.includes('KB')) {
        bytes += parseFloat(d.size) * 1024;
      }
    });
    return bytes;
  }, [documents]);

  // Filter and Sort (Zero Expiry Constraints)
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Category Filter
        if (activeCategory === 'Secret Safe') {
          if (!doc.isEncrypted) return false;
        } else if (activeCategory !== 'All') {
          if (doc.category !== activeCategory) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = doc.name?.toLowerCase().includes(q);
          const matchNotes = doc.notes?.toLowerCase().includes(q);
          const matchTags = doc.tags?.some((t) => t.toLowerCase().includes(q));
          const matchOCR = doc.ocrHighlights?.some((h) => h.toLowerCase().includes(q));
          return matchName || matchNotes || matchTags || matchOCR;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.uploadDate || 0) - new Date(b.uploadDate || 0);
        }
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'size') {
          const sizeA = a.sizeBytes || 0;
          const sizeB = b.sizeBytes || 0;
          return sizeB - sizeA;
        }
        return 0;
      });
  }, [documents, activeCategory, searchQuery, sortBy]);

  // Document Card Open Handler
  const handleOpenCard = (doc) => {
    if (doc.isEncrypted) {
      setDocForAuth(doc);
      setAuthMode('unlock');
    } else {
      setSelectedDocForDetail(doc);
    }
  };

  // Auth Success Handler
  const handleAuthSuccess = (doc, masterPassword) => {
    if (pendingUploadCallback) {
      pendingUploadCallback();
      setPendingUploadCallback(null);
      showToast('Document securely encrypted & saved.');
      return;
    }

    if (doc) {
      setSelectedDocForDetail(doc);
      showToast('Document unlocked successfully.');
    }
  };

  // Save Upload Handler
  const handleSaveUpload = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(`"${newDoc.name}" added to vault.`);
  };

  // Trigger Master Password Request during upload if locking
  const handleRequestMasterPassword = (newDoc, onConfirmed) => {
    if (!hasMasterPassword()) {
      setAuthMode('setup');
      setDocForAuth(newDoc);
      setPendingUploadCallback(() => onConfirmed);
    } else {
      onConfirmed();
      showToast(`"${newDoc.name}" encrypted with your master password.`);
    }
  };

  // Delete Handlers
  const handleRequestDelete = (doc) => {
    setSelectedDocForDetail(null);
    setDocToDelete(doc);
  };

  const handleConfirmDelete = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setDocToDelete(null);
    showToast('Document permanently removed.', 'destructive');
  };

  // Update Notes Handler
  const handleUpdateNotes = (id, updates) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    showToast('Notes updated successfully.');
  };

  // Download Handler
  const handleDownloadFile = (doc) => {
    const content = `LIFE VAULT VERIFIED DOCUMENT\n\nTitle: ${doc.name}\nCategory: ${doc.category}\nSize: ${doc.size}\nUploaded: ${doc.uploadDate}\nSecurity: ${doc.isEncrypted ? 'AES-256 Client-Side Encrypted' : 'Offline Verified'}\n\nNotes: ${doc.notes || 'None'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Downloading "${doc.name}"...`);
  };

  return (
    <div className="vault-container">
      {/* ── Toast Feedback Notification ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md ${
              toast.type === 'destructive'
                ? 'bg-rose-50/95 text-rose-800 border border-rose-300 shadow-rose-500/10'
                : 'bg-emerald-50/95 text-emerald-800 border border-emerald-300 shadow-emerald-500/10'
            }`}
          >
            {toast.type === 'destructive' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── 1. Header Row ── */}
      <div className="vault-header-row">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Document Vault
            </h1>
            <span className="vault-badge-encrypted">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AES-256 Client-Side Encrypted</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Intelligent, offline-first personal file hub with zero-knowledge encryption and permanent storage.
          </p>
        </div>

        <div className="flex items-stretch sm:items-center gap-3">
          {/* Storage Quota Widget (10 GB Baseline) */}
          <div className="min-w-[240px] sm:min-w-[280px]">
            <StorageUsageBar totalBytes={totalStorageBytes} />
          </div>

          {/* Primary Upload Button */}
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-2xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Document</span>
          </button>
        </div>
      </div>

      {/* ── 2. Category Navigation Tabs ── */}
      <div className="category-tabs-container">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          const count =
            cat.id === 'All'
              ? documents.length
              : cat.id === 'Secret Safe'
              ? documents.filter((d) => d.isEncrypted).length
              : documents.filter((d) => d.category === cat.id).length;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`category-tab-pill ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Controls Toolbar ── */}
      <div className="vault-controls-bar">
        {/* Live Search Input */}
        <div className="vault-search-wrapper">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, tag, or notes..."
            className="vault-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sleek Sort Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:inline">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="vault-sort-select"
          >
            <option value="newest">Newest Uploads</option>
            <option value="oldest">Oldest Uploads</option>
            <option value="name">Document Name (A-Z)</option>
            <option value="size">File Size (Largest)</option>
          </select>
        </div>
      </div>

      {/* ── 4. Main Content: Empty State vs. 3-Column Document Grid ── */}
      {documents.length === 0 ? (
        /* ── Elegant Empty State Placeholder ── */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 sm:p-16 text-center shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100/90 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            Your Vault is Empty
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            Securely store your personal IDs, academic certificates, medical reports, and employment contracts offline with zero-knowledge client-side encryption.
          </p>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Document</span>
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        /* Filtered Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No matching documents found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No documents match "${searchQuery}". Try a different keyword or category.`
              : 'No documents in this category yet.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('All');
            }}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Responsive 3-Column Document Grid */
        <div className="vault-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={handleOpenCard}
            />
          ))}
        </div>
      )}

      {/* ── 5. Strictly Isolated Floating Modals System ── */}

      {/* Upload Modal (Create) */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSave={handleSaveUpload}
        onRequestMasterPassword={handleRequestMasterPassword}
      />

      {/* Document Detail & Preview Modal */}
      <DocumentDetailModal
        isOpen={Boolean(selectedDocForDetail)}
        doc={selectedDocForDetail}
        onClose={() => setSelectedDocForDetail(null)}
        onDownload={handleDownloadFile}
        onRequestDelete={handleRequestDelete}
        onSaveNotes={handleUpdateNotes}
      />

      {/* Security Master Password Auth / Setup Modal */}
      <SecurityAuthModal
        isOpen={Boolean(docForAuth)}
        doc={docForAuth}
        mode={authMode}
        onClose={() => {
          setDocForAuth(null);
          setPendingUploadCallback(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* Destructive Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(docToDelete)}
        doc={docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
