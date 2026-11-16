import React, { useState, useEffect } from 'react';
import Toast from '../components/Toast';
import emergencyService from '../services/emergencyService';
import EmergencySOSModal from '../components/emergency/EmergencySOSModal';
import MedicalIDCard from '../components/emergency/MedicalIDCard';
import ICEContactsDirectory from '../components/emergency/ICEContactsDirectory';
import EmergencyVaultLink from '../components/emergency/EmergencyVaultLink';
import { AlertTriangle, ShieldAlert, PhoneCall } from 'lucide-react';
import './Emergency.css';

export default function Emergency() {
  const [profile, setProfile] = useState({
    bloodGroup: '',
    allergies: '',
    chronicConditions: '',
    currentMedications: '',
    organDonor: true,
    insuranceProvider: '',
    insurancePolicyNumber: '',
    hospitalPreference: '',
    medicalNotes: '',
    contacts: [],
  });

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isSOSOpen, setIsSOSOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await emergencyService.getProfile((revalidated) => {
        if (revalidated) setProfile(revalidated);
      });
      if (data) setProfile(data);
    } catch (err) {
      console.warn('Could not load emergency profile:', err.message);
      showToast('Offline mode: Using cached emergency data.', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateMedicalID = async (formUpdates) => {
    try {
      const payload = {
        ...profile,
        ...formUpdates,
      };
      const updated = await emergencyService.updateProfile(payload);
      setProfile(updated);
      showToast('Medical ID details updated successfully.');
    } catch (err) {
      showToast('Failed to save Medical ID.', 'error');
    }
  };

  const handleAddContact = async (newContact) => {
    try {
      const currentContacts = profile.contacts || [];
      // If marked primary, unmark others
      const sanitized = newContact.isPrimary
        ? currentContacts.map((c) => ({ ...c, isPrimary: false }))
        : currentContacts;

      const updatedContacts = [...sanitized, newContact];
      const updated = await emergencyService.updateProfile({
        ...profile,
        contacts: updatedContacts,
      });
      setProfile(updated);
      showToast(`Emergency contact "${newContact.name}" added.`);
    } catch (err) {
      showToast('Failed to add emergency contact.', 'error');
    }
  };

  const handleRemoveContact = async (idx) => {
    try {
      const updatedContacts = (profile.contacts || []).filter((_, i) => i !== idx);
      const updated = await emergencyService.updateProfile({
        ...profile,
        contacts: updatedContacts,
      });
      setProfile(updated);
      showToast('Contact removed from emergency directory.');
    } catch (err) {
      showToast('Failed to delete contact.', 'error');
    }
  };

  const handleSetPrimary = async (idx) => {
    try {
      const updatedContacts = (profile.contacts || []).map((c, i) => ({
        ...c,
        isPrimary: i === idx,
      }));
      const updated = await emergencyService.updateProfile({
        ...profile,
        contacts: updatedContacts,
      });
      setProfile(updated);
      showToast('Primary emergency contact updated.');
    } catch (err) {
      showToast('Failed to set primary contact.', 'error');
    }
  };

  return (
    <div className="emergency-page space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <Toast message={toast?.message} type={toast?.type} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Emergency & SOS Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Offline Ready • 0ms Retrieval</span>
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Rapid medical response telemetry, In-Case-of-Emergency (ICE) speed dial, and panic broadcast.
          </p>
        </div>

        {/* SOS Action Button */}
        <button
          type="button"
          onClick={() => setIsSOSOpen(true)}
          className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-600/25 transition-all transform active:scale-95 shrink-0 self-start md:self-auto border border-rose-500"
        >
          <PhoneCall className="w-5 h-5 animate-bounce" />
          <span>TRIGGER EMERGENCY SOS</span>
        </button>
      </div>

      {/* SECTION 1: Medical ID (First Responder View) */}
      <section aria-label="Medical ID">
        <MedicalIDCard profile={profile} onUpdateProfile={handleUpdateMedicalID} />
      </section>

      {/* SECTION 2: ICE Contacts Directory with 1-Tap Call & SMS */}
      <section aria-label="Emergency Contacts">
        <ICEContactsDirectory
          contacts={profile.contacts || []}
          onAddContact={handleAddContact}
          onRemoveContact={handleRemoveContact}
          onSetPrimary={handleSetPrimary}
        />
      </section>

      {/* SECTION 3: Encrypted Vault Shortcut */}
      <section aria-label="Encrypted Vault Documents">
        <EmergencyVaultLink />
      </section>

      {/* Emergency SOS Modal */}
      <EmergencySOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
        profile={profile}
        contacts={profile.contacts || []}
      />
    </div>
  );
}
