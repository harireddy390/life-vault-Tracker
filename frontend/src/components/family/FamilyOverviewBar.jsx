import React from 'react';
import {
  Users,
  ShieldAlert,
  Calendar,
  Plus,
  FilePlus,
  Bell,
  HeartHandshake,
} from 'lucide-react';

export default function FamilyOverviewBar({
  members = [],
  renewals = [],
  onAddMember,
  onUploadDocument,
  onAddRenewal,
}) {
  const totalMembers = members.length;
  const emergencyContacts = members.filter((m) => m.is_emergency_contact);
  const upcomingRenewals = renewals.filter((r) => r.status !== 'completed');
  const overdueCount = renewals.filter((r) => r.is_overdue).length;

  return (
    <div className="fam-overview-section">
      {/* Action Header Row */}
      <div className="fam-header-row">
        <div>
          <h1 className="fam-page-title">
            <Users size={24} color="#4f46e5" /> Family & Dependents Hub
          </h1>
          <p className="fam-page-subtitle">
            Secure records, medical profiles, critical documents, and emergency access coordination
          </p>
        </div>

        <div className="fam-action-group">
          <button className="fam-btn-ghost fam-btn-sm" onClick={onAddRenewal}>
            <Calendar size={14} /> + Renewal
          </button>
          <button className="fam-btn-ghost fam-btn-sm" onClick={onUploadDocument}>
            <FilePlus size={14} /> + Document
          </button>
          <button className="fam-btn-primary fam-btn-sm" onClick={onAddMember}>
            <Plus size={15} /> Add Member
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="fam-metrics-grid">
        {/* Metric 1: Total Members */}
        <div className="fam-metric-card members">
          <div className="fam-metric-header">
            <span className="fam-metric-label">Family Members</span>
            <div className="fam-metric-icon-wrap indigo">
              <Users size={18} />
            </div>
          </div>
          <div className="fam-metric-value tabular-nums">{totalMembers}</div>
          <div className="fam-metric-subtext">Active dependent profiles tracked</div>
        </div>

        {/* Metric 2: Emergency SOS Contacts */}
        <div className="fam-metric-card emergency">
          <div className="fam-metric-header">
            <span className="fam-metric-label">Emergency SOS Nominees</span>
            <div className="fam-metric-icon-wrap crimson">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="fam-metric-value tabular-nums crimson">
            {emergencyContacts.length}
          </div>
          <div className="fam-metric-subtext">
            {emergencyContacts.length > 0
              ? `${emergencyContacts.map((c) => c.full_name).slice(0, 2).join(', ')}${emergencyContacts.length > 2 ? ` +${emergencyContacts.length - 2}` : ''}`
              : 'No emergency contacts designated'}
          </div>
        </div>

        {/* Metric 3: Upcoming Renewals / Key Dates */}
        <div className="fam-metric-card renewals">
          <div className="fam-metric-header">
            <span className="fam-metric-label">Key Dates & Renewals</span>
            <div className={`fam-metric-icon-wrap ${overdueCount > 0 ? 'crimson' : 'amber'}`}>
              <Calendar size={18} />
            </div>
          </div>
          <div className={`fam-metric-value tabular-nums ${overdueCount > 0 ? 'crimson' : 'amber'}`}>
            {upcomingRenewals.length}
          </div>
          <div className="fam-metric-subtext">
            {overdueCount > 0 ? (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>{overdueCount} action required / overdue!</span>
            ) : (
              'Passports, checkups & policy milestones'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
