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
  Scale,
} from 'lucide-react';

import DocumentCard from '../components/vault/DocumentCard';
import DocumentDetailModal from '../components/vault/DocumentDetailModal';
import UploadModal from '../components/vault/UploadModal';
import SecurityAuthModal from '../components/vault/SecurityAuthModal';
import DeleteConfirmModal from '../components/vault/DeleteConfirmModal';
import StorageUsageBar from '../components/vault/StorageUsageBar';
import vaultStorage, { BASELINE_QUOTA_BYTES } from '../services/vaultStorage';
import vaultCrypto from '../services/vaultCrypto';
import './Vault.css';

const STORAGE_KEY = 'life_vault_documents';

const CATEGORIES = [
  { id: 'All', label: 'All Documents', icon: Layers },
  { id: 'Identity', label: 'Identity', icon: FileBadge },
  { id: 'Financial', label: 'Financial', icon: Briefcase },
  { id: 'Health', label: 'Health', icon: HeartPulse },
  { id: 'Legal', label: 'Legal', icon: Scale },
  { id: 'Personal', label: 'Personal', icon: GraduationCap },
  { id: 'Secret Safe', label: 'Secret Safe', icon: Lock },
];

export default function Vault() {
  // ── 1. State Initialization ──
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backendHasMaster, setBackendHasMaster] = useState(false);
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);

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

  // Load from backend
  useEffect(() => {
    async function loadVault() {
      setIsLoading(true);
      try {
        const [fetchedDocs, usedBytes, hasMaster] = await Promise.all([
          vaultStorage.getAllDocuments(),
          vaultStorage.getTotalStorageUsed(),
          vaultCrypto.checkHasMasterPassword()
        ]);
        setDocuments(fetchedDocs);
        setTotalStorageBytes(usedBytes);
        setBackendHasMaster(hasMaster);
      } catch (error) {
        console.error('Error loading vault data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadVault();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Filter and Sort (Zero Expiry Constraints)
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Category Filter
        if (activeCategory === 'Secret Safe') {
          if (!doc.isEncrypted) return false;
        } else if (activeCategory !== 'All') {
          const categoryAliases = {
            'Identity': ['Identity', 'Government IDs'],
            'Financial': ['Financial', 'Finance & Employment'],
            'Health': ['Health', 'Medical & Health'],
            'Legal': ['Legal'],
            'Personal': ['Personal', 'Academics & College', 'Personal & General', 'General'],
          };
          const matches = categoryAliases[activeCategory] || [activeCategory];
          if (!matches.includes(doc.category)) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = doc.name?.toLowerCase().includes(q);
          const matchNotes = doc.notes?.toLowerCase().includes(q);
          const matchTags = doc.tags?.some((t) => t.toLowerCase().includes(q));
          return matchName || matchNotes || matchTags;
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
  const handleSaveUpload = async (newDoc) => {
    try {
      showToast(`Securing "${newDoc.name}" to vault...`);
      const formData = new FormData();
      formData.append('originalName', newDoc.name);
      formData.append('category', newDoc.category);
      formData.append('notes', newDoc.notes || '');
      formData.append('tags', JSON.stringify(newDoc.tags || []));
      formData.append('isEncrypted', newDoc.isEncrypted);

      if (newDoc.isEncrypted) {
        const password = vaultCrypto.getMasterPassword();
        if (!password) {
           showToast('Vault password not set in memory', 'destructive');
           throw new Error('Vault master password not found in memory. Please unlock your vault.');
        }
        const { encryptedBlob, salt, iv } = await vaultCrypto.encryptBlob(newDoc.fileBlob, password);
        // Append encrypted file instead
        formData.append('file', encryptedBlob, newDoc.name);
        formData.append('salt', JSON.stringify(salt));
        formData.append('iv', JSON.stringify(iv));
      } else {
        formData.append('file', newDoc.fileBlob);
      }

      const savedDoc = await vaultStorage.saveDocument(formData);
      setDocuments((prev) => [savedDoc, ...prev]);
      
      const usedBytes = await vaultStorage.getTotalStorageUsed();
      setTotalStorageBytes(usedBytes);
      
      showToast('Document secured to your vault');
      return savedDoc;
    } catch (error) {
      console.error('Upload error:', error);
      const errMsg = error?.response?.data?.message || error?.message || 'Failed to upload document';
      showToast(errMsg, 'destructive');
      throw error;
    }
  };

  // Trigger Master Password Request during upload if locking
  const handleRequestMasterPassword = (newDoc, onConfirmed) => {
    if (!backendHasMaster) {
      setAuthMode('setup');
      setDocForAuth(newDoc);
      setPendingUploadCallback(() => onConfirmed);
    } else if (!vaultCrypto.hasMasterPasswordInMemory()) {
      setAuthMode('unlock');
      setDocForAuth(newDoc);
      setPendingUploadCallback(() => onConfirmed);
    } else {
      onConfirmed();
      showToast(`"${newDoc?.name || 'Document'}" encrypted with your master password.`);
    }
  };

  // Delete Handlers
  const handleRequestDelete = (doc) => {
    setSelectedDocForDetail(null);
    setDocToDelete(doc);
  };

  const handleConfirmDelete = async (id) => {
    try {
      await vaultStorage.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setDocToDelete(null);
      const usedBytes = await vaultStorage.getTotalStorageUsed();
      setTotalStorageBytes(usedBytes);
      showToast('Document permanently removed.', 'destructive');
    } catch (error) {
      showToast('Failed to delete document', 'destructive');
    }
  };

  // Update Notes Handler
  const handleUpdateNotes = async (id, updates) => {
    try {
      await vaultStorage.updateDocument(id, updates);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );
      showToast('Notes updated successfully.');
    } catch (error) {
      showToast('Failed to update notes', 'destructive');
    }
  };

  // Download Handler
  const handleDownloadFile = async (doc) => {
    try {
      showToast(`Preparing download for "${doc.name}"...`);
      const blob = await vaultStorage.downloadDocument(doc.id, doc.name);
      
      let finalBlob = blob;
      // If encrypted, decrypt it first
      if (doc.isEncrypted) {
        const password = vaultCrypto.getMasterPassword();
        if (!password) {
           showToast('Please unlock the vault first', 'destructive');
           setDocForAuth(doc);
           setAuthMode('unlock');
           return;
        }
        const decryptedBuffer = await vaultCrypto.decryptBlob(blob, password, doc.salt, doc.iv);
        finalBlob = new Blob([decryptedBuffer], { type: doc.mimeType || 'application/octet-stream' });
      }

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      showToast('Failed to download document', 'destructive');
    }
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

          {/* Primary Upload Button (High-Contrast, Popout Effects, Micro-translation & Hover Glow) */}
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-700/80 hover:border-blue-500/60 text-slate-100 rounded-xl text-xs font-semibold shadow-lg shadow-slate-950/40 hover:brightness-110 hover:ring-2 hover:ring-blue-500/40 hover:translate-y-[-1px] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-all duration-200 cursor-pointer shrink-0"
            aria-label="Add Document to Vault"
          >
            <span className="w-5 h-5 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:text-blue-300 group-hover:scale-110 group-hover:border-blue-400/50 transition-all duration-200">
              <Plus className="w-3.5 h-3.5" />
            </span>
            <span className="tracking-wide">Add Document</span>
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
              : documents.filter((d) => {
                  const categoryAliases = {
                    'Identity': ['Identity', 'Government IDs'],
                    'Financial': ['Financial', 'Finance & Employment'],
                    'Health': ['Health', 'Medical & Health'],
                    'Legal': ['Legal'],
                    'Personal': ['Personal', 'Academics & College', 'Personal & General', 'General'],
                  };
                  const matches = categoryAliases[cat.id] || [cat.id];
                  return matches.includes(d.category);
                }).length;

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
        onToast={showToast}
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
