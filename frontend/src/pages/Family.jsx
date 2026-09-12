import React, { useState, useEffect } from 'react';
import familyService from '../services/familyService';
import Toast from '../components/Toast';
import MemberSelectorRail from '../components/family/MemberSelectorRail';
import MemberDossierCard from '../components/family/MemberDossierCard';
import FamilyDocumentVault from '../components/family/FamilyDocumentVault';
import FamilyRenewalsWatcher from '../components/family/FamilyRenewalsWatcher';
import FamilyMemberModal from '../components/family/FamilyMemberModal';
import FamilyDocumentModal from '../components/family/FamilyDocumentModal';
import FamilyRenewalModal from '../components/family/FamilyRenewalModal';
import FamilyDocPreviewModal from '../components/family/FamilyDocPreviewModal';
import FamilyDeleteModal from '../components/family/FamilyDeleteModal';
import { 
  Users, 
  ShieldAlert, 
  Plus, 
  Upload, 
  Phone, 
  Mail, 
  Droplets, 
  Heart, 
  X, 
  AlertTriangle,
  UserPlus,
  CalendarClock,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Activity
} from 'lucide-react';
import './Family.css';

export default function Family() {
  // Main Data States
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal States
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberModalData, setMemberModalData] = useState(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch documents when selected member changes
  useEffect(() => {
    if (selectedMemberId) {
      loadDocumentsForMember(selectedMemberId);
    } else {
      setDocuments([]);
    }
  }, [selectedMemberId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [membersData, renewalsData] = await Promise.all([
        familyService.getFamilyMembers(),
        familyService.getRenewals()
      ]);

      setMembers(membersData || []);
      setRenewals(renewalsData || []);

      if (membersData && membersData.length > 0) {
        setSelectedMemberId(membersData[0]._id);
      }
    } catch (err) {
      console.error('Failed to load family data:', err);
      showToast('Could not load family data. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentsForMember = async (memberId) => {
    setLoadingDocs(true);
    try {
      const docs = await familyService.getMemberDocuments(memberId);
      setDocuments(docs || []);
    } catch (err) {
      console.error('Failed to load member documents:', err);
      showToast('Could not load documents for this member.', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Selected member object
  const selectedMember = members.find((m) => m._id === selectedMemberId) || null;

  // Overview metrics
  const totalMembers = members.length;
  const emergencyContacts = members.filter((m) => m.is_emergency_contact);
  const emergencyCount = emergencyContacts.length;
  const pendingRenewalsCount = renewals.filter((r) => r.status !== 'completed').length;

  // ── Member Handlers with Optimistic Updates ──────────────────────────────
  const handleOpenAddMember = () => {
    setMemberModalData(null);
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (member) => {
    setMemberModalData(member);
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (formData) => {
    setIsSubmitting(true);
    try {
      if (memberModalData) {
        // Update existing member
        const updated = await familyService.updateMember(memberModalData._id, formData);
        setMembers((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
        showToast(`${updated.full_name}'s profile updated.`);
      } else {
        // Create new member
        const created = await familyService.createMember(formData);
        setMembers((prev) => [...prev, created]);
        setSelectedMemberId(created._id);
        showToast(`${created.full_name} added to family hub.`);
      }
      setIsMemberModalOpen(false);
    } catch (err) {
      console.error('Error saving family member:', err);
      showToast('Failed to save family member profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemberRequest = (member) => {
    setDeleteConfig({
      type: 'member',
      item: member,
      title: `Delete ${member.full_name}'s Profile`,
      message: `Are you sure you want to delete ${member.full_name}? All uploaded documents, health records, and associated milestones will be permanently erased.`
    });
    setIsDeleteModalOpen(true);
  };

  // ── Document Handlers with Optimistic Updates ────────────────────────────
  const handleOpenUploadDoc = () => {
    if (members.length === 0) {
      showToast('Please add a family member first.', 'error');
      return;
    }
    setIsDocModalOpen(true);
  };

  const handleUploadDocument = async ({ memberId, formData }) => {
    const targetMemberId = memberId || selectedMemberId;
    if (!targetMemberId) return;

    setIsSubmitting(true);
    try {
      const newDoc = await familyService.uploadDocument(targetMemberId, formData);
      if (targetMemberId === selectedMemberId) {
        setDocuments((prev) => [newDoc, ...prev]);
      }
      setIsDocModalOpen(false);
      showToast(`Document "${newDoc.file_name}" uploaded successfully.`);
    } catch (err) {
      console.error('Error uploading document:', err);
      showToast(err.response?.data?.message || 'Failed to upload document.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviewDoc = (doc) => {
    setPreviewDoc(doc);
    setIsPreviewModalOpen(true);
  };

  const handleDeleteDocRequest = (doc) => {
    setDeleteConfig({
      type: 'document',
      item: doc,
      title: 'Delete Document',
      message: `Are you sure you want to delete "${doc.file_name}"? This file will be permanently removed from your vault.`
    });
    setIsDeleteModalOpen(true);
  };

  // ── Renewal Handlers with Optimistic Updates ─────────────────────────────
  const handleOpenAddRenewal = () => {
    if (members.length === 0) {
      showToast('Please add a family member first.', 'error');
      return;
    }
    setIsRenewalModalOpen(true);
  };

  const handleCreateRenewal = async (formData) => {
    setIsSubmitting(true);
    try {
      const created = await familyService.createRenewal(formData);
      setRenewals((prev) => [created, ...prev]);
      setIsRenewalModalOpen(false);
      showToast(`Milestone "${created.title}" scheduled.`);
    } catch (err) {
      console.error('Error creating renewal:', err);
      showToast('Failed to add milestone.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Optimistic toggle for instant UI responsiveness
  const handleToggleRenewalStatus = async (item) => {
    const previousStatus = item.status;
    const optimisticStatus = previousStatus === 'completed' ? 'upcoming' : 'completed';

    // Optimistic UI update
    setRenewals((prev) =>
      prev.map((r) => (r._id === item._id ? { ...r, status: optimisticStatus } : r))
    );

    try {
      const updated = await familyService.toggleRenewal(item._id);
      setRenewals((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      showToast(`Marked "${updated.title}" as ${updated.status}.`);
    } catch (err) {
      console.error('Error toggling renewal:', err);
      setRenewals((prev) =>
        prev.map((r) => (r._id === item._id ? { ...r, status: previousStatus } : r))
      );
      showToast('Could not update milestone status.', 'error');
    }
  };

  const handleDeleteRenewalRequest = (item) => {
    setDeleteConfig({
      type: 'renewal',
      item,
      title: 'Delete Milestone',
      message: `Are you sure you want to remove the milestone "${item.title}"?`
    });
    setIsDeleteModalOpen(true);
  };

  // ── Confirm Delete Action ────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteConfig) return;
    setIsSubmitting(true);
    try {
      if (deleteConfig.type === 'member') {
        const id = deleteConfig.item._id;
        await familyService.deleteMember(id);
        const remaining = members.filter((m) => m._id !== id);
        setMembers(remaining);
        if (selectedMemberId === id) {
          setSelectedMemberId(remaining[0]?._id || null);
        }
        setRenewals((prev) => prev.filter((r) => (r.family_member?._id || r.family_member) !== id));
        showToast('Member profile and associated records deleted.');
      } else if (deleteConfig.type === 'document') {
        const id = deleteConfig.item._id;
        await familyService.deleteDocument(id);
        setDocuments((prev) => prev.filter((d) => d._id !== id));
        showToast('Document deleted.');
      } else if (deleteConfig.type === 'renewal') {
        const id = deleteConfig.item._id;
        await familyService.deleteRenewal(id);
        setRenewals((prev) => prev.filter((r) => r._id !== id));
        showToast('Milestone deleted.');
      }
      setIsDeleteModalOpen(false);
      setDeleteConfig(null);
    } catch (err) {
      console.error('Delete action failed:', err);
      showToast('Failed to delete item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="family-page">
      <Toast message={toast?.message} type={toast?.type} />

      {/* ── Header Bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Family & Dependents</h1>
            <span className="vault-badge-encrypted">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypted Records</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized profile dossiers, medical records, isolated vault documents, and emergency coordination.
          </p>
        </div>

        {/* Action Buttons & Quick SOS */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="vault-btn-emergency"
            title="Open Emergency Coordination Directory"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
            <span>SOS Directory</span>
          </button>
          <button
            onClick={handleOpenUploadDoc}
            className="vault-btn-ghost"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={handleOpenAddMember}
            className="vault-btn-primary"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Pills ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="fam-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Members</span>
              <span className="text-xl font-bold text-slate-900 tracking-tight">{totalMembers}</span>
            </div>
          </div>
          <span className="badge-cobalt">Profiles Active</span>
        </div>

        <div className="fam-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Emergency Contacts</span>
              <span className="text-xl font-bold text-slate-900 tracking-tight">{emergencyCount}</span>
            </div>
          </div>
          <span className="badge-crimson">SOS Nominees</span>
        </div>

        <div className="fam-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Renewals</span>
              <span className="text-xl font-bold text-slate-900 tracking-tight">{pendingRenewalsCount}</span>
            </div>
          </div>
          <span className="badge-amber">Key Dates</span>
        </div>
      </div>

      {loading ? (
        <div className="fam-card p-16 text-center text-slate-500 my-6">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-700">Decrypting & Loading Family Hub...</p>
        </div>
      ) : members.length === 0 ? (
        /* Empty State */
        <div className="fam-card p-12 text-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No Family Profiles Configured</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 mb-6">
            Begin building your family vault by adding profiles for your spouse, children, parents, or dependents to organize health metrics, passports, and emergency credentials.
          </p>
          <button
            onClick={handleOpenAddMember}
            className="vault-btn-action"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Family Member</span>
          </button>
        </div>
      ) : (
        <>
          {/* ── Member Tabs Rail ───────────────────────────────────────────── */}
          <MemberSelectorRail
            members={members}
            selectedMemberId={selectedMemberId}
            onSelectMember={(id) => setSelectedMemberId(id)}
            onOpenAddMember={handleOpenAddMember}
          />

          {/* ── Main Grid: 2 Columns ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Selected Member's Clinical Snapshot & Isolated Documents */}
            <div className="lg:col-span-7 space-y-6">
              <MemberDossierCard
                member={selectedMember}
                onEditMember={handleOpenEditMember}
                onDeleteMember={handleDeleteMemberRequest}
              />

              <FamilyDocumentVault
                documents={documents}
                selectedMember={selectedMember}
                onOpenUploadDoc={handleOpenUploadDoc}
                onPreviewDoc={handlePreviewDoc}
                onDeleteDoc={handleDeleteDocRequest}
              />
            </div>

            {/* Right Column: Shared Family Renewal Timeline */}
            <div className="lg:col-span-5">
              <FamilyRenewalsWatcher
                renewals={renewals}
                members={members}
                selectedMember={selectedMember}
                onOpenAddRenewal={handleOpenAddRenewal}
                onToggleRenewalStatus={handleToggleRenewalStatus}
                onDeleteRenewal={handleDeleteRenewalRequest}
              />
            </div>
          </div>
        </>
      )}

      {/* ── In-Context Frosted Popups (Zero Redirects) ─────────────────────── */}
      {/* 1. Add / Edit Member Modal */}
      <FamilyMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSubmit={handleSaveMember}
        initialData={memberModalData}
        isSubmitting={isSubmitting}
      />

      {/* 2. Drag & Drop Document Upload Modal */}
      <FamilyDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onSubmit={handleUploadDocument}
        members={members}
        defaultMemberId={selectedMemberId}
        isSubmitting={isSubmitting}
      />

      {/* 3. Add Renewal Milestone Modal */}
      <FamilyRenewalModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        onSubmit={handleCreateRenewal}
        members={members}
        selectedMemberId={selectedMemberId}
        isSubmitting={isSubmitting}
      />

      {/* 4. Document Quick Previewer Modal */}
      <FamilyDocPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        document={previewDoc}
      />

      {/* 5. Delete Confirmation Alert Modal */}
      <FamilyDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={deleteConfig?.title}
        message={deleteConfig?.message}
        isSubmitting={isSubmitting}
      />

      {/* 6. Quick SOS Emergency Coordination Directory Modal */}
      {isSosModalOpen && (
        <div className="frosted-modal-overlay">
          <div className="frosted-modal-container max-w-2xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 bg-[#0b1120] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Emergency Coordination & SOS Directory</h3>
                  <p className="text-[11px] text-slate-400">Critical medical data, blood groups, and first responder contacts</p>
                </div>
              </div>
              <button
                onClick={() => setIsSosModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
              {emergencyContacts.length === 0 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center text-amber-200 text-xs">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-400" />
                  <p className="font-bold">No Emergency Contacts Designated</p>
                  <p className="text-[11px] text-amber-300/80 mt-1">
                    Edit family profiles and toggle "Primary Emergency Contact" so they appear here in high-priority view.
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {members.map((m) => (
                  <div
                    key={m._id}
                    className={`p-4 rounded-xl border ${
                      m.is_emergency_contact
                        ? 'bg-rose-950/20 border-rose-800/60 ring-1 ring-rose-500/30'
                        : 'bg-[#1e293b]/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{m.full_name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {m.relationship}
                        </span>
                        {m.is_emergency_contact && (
                          <span className="badge-crimson">
                            SOS Contact
                          </span>
                        )}
                      </div>

                      {m.blood_group && m.blood_group !== 'Unknown' && (
                        <span className="badge-crimson">
                          <Droplets className="w-3 h-3 text-rose-400" />
                          Blood: {m.blood_group}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-slate-400 text-[11px]">Phone: </span>
                        {m.phone_number ? (
                          <a
                            href={`tel:${m.phone_number}`}
                            className="font-semibold text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {m.phone_number}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px]">Email: </span>
                        {m.email ? (
                          <a
                            href={`mailto:${m.email}`}
                            className="font-semibold text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" />
                            {m.email}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </div>
                    </div>

                    {/* Allergies / Clinical alert */}
                    {m.allergies && m.allergies.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <Heart className="w-3 h-3" /> Allergies:
                        </span>
                        {m.allergies.map((a, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-[#0b1120] border-t border-slate-800 flex items-center justify-end shrink-0">
              <button
                onClick={() => setIsSosModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
