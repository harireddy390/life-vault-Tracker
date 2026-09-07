import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  GraduationCap,
  FileBadge,
  HeartPulse,
  Briefcase,
  Lock,
  X,
  HardDrive,
  Filter,
} from 'lucide-react';

import DocumentCard from '../components/vault/DocumentCard';
import DocumentDetailModal from '../components/vault/DocumentDetailModal';
import UploadModal from '../components/vault/UploadModal';
import PinAuthModal from '../components/vault/PinAuthModal';
import './Vault.css';

// ── Clean Deduplicated Seed Data ──
export const initialDocuments = [
  {
    id: 'doc-1',
    name: 'Executive Health Checkup & Policy.pdf',
    category: 'Medical & Health',
    size: '1.7 MB',
    mimeType: 'application/pdf',
    uploadDate: '2026-09-02',
    expiryDate: '2027-05-10',
    tags: ['Insurance', 'Health', 'Medical Report'],
    notes: 'Family floater coverage policy number stored. Cashless claims active.',
    isEncrypted: false,
    ocrHighlights: ['Policy Holder', 'Cashless Network', 'TPA Card Validated'],
  },
  {
    id: 'doc-2',
    name: 'University Degree & Attested Transcripts.pdf',
    category: 'Academics & College',
    size: '2.4 MB',
    mimeType: 'application/pdf',
    uploadDate: '2026-08-23',
    expiryDate: null,
    tags: ['Degree', 'Academics', 'Transcript'],
    notes: 'Official attested engineering degree copy for background checks.',
    isEncrypted: false,
    ocrHighlights: ['Dean Signature', 'Degree Conferred', 'Grade Sheet'],
  },
  {
    id: 'doc-3',
    name: 'National Passport & Travel Document.pdf',
    category: 'Government IDs',
    size: '1.2 MB',
    mimeType: 'application/pdf',
    uploadDate: '2026-08-18',
    expiryDate: '2026-09-25', // Expiring in < 30 days
    tags: ['Passport', 'Identity', 'Travel'],
    notes: 'Renewal scheduled before international semester departure.',
    isEncrypted: false,
    ocrHighlights: ['Republic Authority', 'Date of Issue', 'Immigration Clearance'],
  },
  {
    id: 'doc-4',
    name: 'Confidential Employment Agreement & NDA.pdf',
    category: 'Finance & Employment',
    size: '820 KB',
    mimeType: 'application/pdf',
    uploadDate: '2026-08-08',
    expiryDate: '2028-08-01',
    tags: ['Compensation', 'Contract', 'Career'],
    notes: 'Contains base salary terms, IP assignment, and equity lockup timeline.',
    isEncrypted: true, // Secret Safe Item
    ocrHighlights: ['Confidential', 'Non-Disclosure', 'Compensation Tier'],
  },
  {
    id: 'doc-5',
    name: 'Motor Vehicle Registration & Driving License.pdf',
    category: 'Government IDs',
    size: '1.1 MB',
    mimeType: 'application/pdf',
    uploadDate: '2026-07-10',
    expiryDate: '2026-08-15', // Expired
    tags: ['Transport', 'License', 'Identity'],
    notes: 'Expired last month. Driving renewal test booking pending.',
    isEncrypted: false,
    ocrHighlights: ['Transport Department', 'Class of Vehicle', 'Digital Smart Card'],
  },
];

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
  // Load clean deduplicated documents from storage
  const [documents, setDocuments] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Deduplicate by ID
          const uniqueMap = new Map();
          parsed.forEach((d) => uniqueMap.set(d.id, d));
          return Array.from(uniqueMap.values());
        }
      }
    } catch (e) {
      console.error('Failed to parse stored vault documents:', e);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialDocuments));
    return initialDocuments;
  });

  // UI state
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'expiry' | 'name' | 'size'
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Modals (Strictly isolated overlay dialogs)
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocForDetail, setSelectedDocForDetail] = useState(null);
  const [lockedDocForAuth, setLockedDocForAuth] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [documents]);

  // Calculate used storage for Storage Meter
  const totalStorageMB = useMemo(() => {
    let totalMB = 0;
    documents.forEach((d) => {
      const sizeStr = d.size || '1 MB';
      if (sizeStr.includes('MB')) {
        totalMB += parseFloat(sizeStr);
      } else if (sizeStr.includes('KB')) {
        totalMB += parseFloat(sizeStr) / 1024;
      }
    });
    return Math.max(0.5, parseFloat(totalMB.toFixed(1)));
  }, [documents]);

  // Expiry Watchdog Calculation
  const expiryAlertDocs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return documents.filter((d) => {
      if (!d.expiryDate) return false;
      const exp = new Date(d.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      return diffDays <= 30; // Expired or expiring within 30 days
    });
  }, [documents]);

  // Filter and Sort
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Category Filter
        if (activeCategory === 'Secret Safe') {
          if (!doc.isEncrypted) return false;
        } else if (activeCategory !== 'All') {
          if (doc.category !== activeCategory) return false;
        }

        // Search Filter
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
          const parseMB = (s) => (s?.includes('KB') ? parseFloat(s) / 1024 : parseFloat(s) || 0);
          return parseMB(b.size) - parseMB(a.size);
        }
        if (sortBy === 'expiry') {
          const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
          const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
          return expA - expB;
        }
        return 0;
      });
  }, [documents, activeCategory, searchQuery, sortBy]);

  // Handlers
  const handleOpenCard = (doc) => {
    if (doc.isEncrypted) {
      setLockedDocForAuth(doc);
    } else {
      setSelectedDocForDetail(doc);
    }
  };

  const handlePinSuccess = (doc) => {
    setLockedDocForAuth(null);
    setSelectedDocForDetail(doc);
  };

  const handleSaveUpload = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleDeleteDocument = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateNotes = (id, updates) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const handleDownloadFile = (doc) => {
    // Generate simulated text/svg blob download
    const content = `LIFE VAULT VERIFIED DOCUMENT\n\nTitle: ${doc.name}\nCategory: ${doc.category}\nSize: ${doc.size}\nUploaded: ${doc.uploadDate}\nSecurity: ${doc.isEncrypted ? 'AES-256 Encrypted' : 'Offline Verified'}\n\nNotes: ${doc.notes || 'None'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="vault-container">
      {/* ── 1. Header ── */}
      <div className="vault-header-row">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Document Vault
            </h1>
            <span className="vault-badge-encrypted">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AES-256 Client-Side Encrypted</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Secure, offline-first personal file hub with renewal alerts and instant search.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Compact Storage Meter */}
          <div className="storage-meter-box">
            <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
            <div className="text-xs">
              <div className="font-bold text-slate-800">
                <span>{totalStorageMB} MB</span>
                <span className="text-slate-400 font-normal"> of 100 MB used</span>
              </div>
              <div className="storage-track mt-1">
                <div
                  className="storage-fill"
                  style={{ width: `${Math.min(100, (totalStorageMB / 100) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Upload Document</span>
          </button>
        </div>
      </div>

      {/* ── 2. Expiry Watchdog Banner (Render ONLY if expiring/expired) ── */}
      {!isBannerDismissed && expiryAlertDocs.length > 0 && (
        <div className="expiry-watchdog-banner">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Document Expiry Watchdog Alert
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                <strong className="text-rose-700 font-semibold">
                  {expiryAlertDocs.length} document{expiryAlertDocs.length > 1 ? 's' : ''}
                </strong>{' '}
                have expired or are expiring within 30 days. Please inspect and renew.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortBy('expiry')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-amber-900 border border-amber-300 hover:bg-amber-50 transition cursor-pointer"
            >
              Sort by Imminent Expiry
            </button>
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition cursor-pointer"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Category Navigation Tabs ── */}
      <div className="category-tabs-container">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`category-tab-pill ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 4. Controls Toolbar ── */}
      <div className="vault-controls-bar">
        {/* Search Input */}
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
            <option value="expiry">Sort by Imminent Expiry</option>
            <option value="name">Document Name (A-Z)</option>
            <option value="size">File Size (Largest)</option>
          </select>
        </div>
      </div>

      {/* ── 5. Document Grid (3 Columns) ── */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No matching documents found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No documents match "${searchQuery}". Try clearing the search or switching categories.`
              : 'No documents in this category yet. Upload a document to get started.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('All');
              setIsUploadOpen(true);
            }}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Upload to Vault
          </button>
        </div>
      ) : (
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

      {/* ── STRICTLY ISOLATED FLOATING MODALS (NEVER RENDER INLINE AT BOTTOM) ── */}

      {/* 1. Document Details & Preview Modal */}
      <DocumentDetailModal
        isOpen={Boolean(selectedDocForDetail)}
        doc={selectedDocForDetail}
        onClose={() => setSelectedDocForDetail(null)}
        onDownload={handleDownloadFile}
        onDelete={handleDeleteDocument}
        onSaveNotes={handleUpdateNotes}
      />

      {/* 2. Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSave={handleSaveUpload}
      />

      {/* 3. Secret Safe PIN Modal */}
      <PinAuthModal
        isOpen={Boolean(lockedDocForAuth)}
        doc={lockedDocForAuth}
        onClose={() => setLockedDocForAuth(null)}
        onSuccess={handlePinSuccess}
      />
    </div>
  );
}
