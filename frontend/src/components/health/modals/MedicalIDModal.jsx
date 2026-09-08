import React, { useState, useEffect } from 'react';
import { X, Trash2, Phone, Plus, User, ShieldCheck } from 'lucide-react';
import { updateEmergencyProfile, addContact, deleteContact } from '../../../services/healthService';

const BLOOD_TYPES = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function TagInput({
  label,
  values,
  onChange,
  placeholder,
  colorClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  const remove = (tag) => onChange(values.filter((t) => t !== tag));
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          className="h-input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={add}
          className="vault-btn-ghost px-3 text-xs"
          title="Add"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${colorClass}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MedicalIDModal({ isOpen, profile, contacts, onClose, onSaved }) {
  const [form, setForm] = useState({
    bloodType: 'Unknown',
    criticalAllergies: [],
    chronicConditions: [],
    implantedDevices: '',
    organDonor: false,
    specialNotes: '',
  });
  const [contactForm, setContactForm] = useState({
    name: '',
    relationship: '',
    phone: '',
    isPrimary: false,
  });
  const [saving, setSaving] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [localContacts, setLocalContacts] = useState([]);

  useEffect(() => {
    if (profile) {
      setForm({
        bloodType: profile.bloodType || 'Unknown',
        criticalAllergies: profile.criticalAllergies || [],
        chronicConditions: profile.chronicConditions || [],
        implantedDevices: profile.implantedDevices || '',
        organDonor: profile.organDonor || false,
        specialNotes: profile.specialNotes || '',
      });
    }
    setLocalContacts(contacts || []);
  }, [profile, contacts, isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmergencyProfile(form);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.name || !contactForm.relationship || !contactForm.phone) return;
    setAddingContact(true);
    try {
      const newC = await addContact(contactForm);
      setLocalContacts((prev) => [...prev, newC]);
      setContactForm({ name: '', relationship: '', phone: '', isPrimary: false });
    } catch (e) {
      console.error(e);
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      await deleteContact(id);
      setLocalContacts((prev) => prev.filter((c) => c._id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-modal-backdrop" onClick={onClose}>
      <div className="h-modal-card max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="h-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">Edit Emergency Medical ID</h3>
              <p className="text-xs text-slate-400 mt-0.5">Clinical emergency triage and responder contact details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="h-modal-body space-y-5">
          {/* Blood Type & Organ Donor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1.5">
                Blood Type Group
              </label>
              <select
                className="h-input cursor-pointer"
                value={form.bloodType}
                onChange={(e) => setForm((f) => ({ ...f, bloodType: e.target.value }))}
              >
                {BLOOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl w-full hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={form.organDonor}
                  onChange={(e) => setForm((f) => ({ ...f, organDonor: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-slate-700 bg-slate-800 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-200">Registered Organ Donor</span>
              </label>
            </div>
          </div>

          {/* Allergies */}
          <TagInput
            label="Critical Allergies"
            values={form.criticalAllergies}
            onChange={(v) => setForm((f) => ({ ...f, criticalAllergies: v }))}
            placeholder="Type allergy and press Enter (e.g. Penicillin, Peanuts)"
            colorClass="bg-rose-500/15 text-rose-300 border-rose-500/30"
          />

          {/* Conditions */}
          <TagInput
            label="Chronic Conditions"
            values={form.chronicConditions}
            onChange={(v) => setForm((f) => ({ ...f, chronicConditions: v }))}
            placeholder="Type condition and press Enter (e.g. Type 2 Diabetes, Asthma)"
            colorClass="bg-amber-500/15 text-amber-300 border-amber-500/30"
          />

          {/* Implanted Devices */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Implanted Medical Devices
            </label>
            <input
              className="h-input"
              value={form.implantedDevices}
              onChange={(e) => setForm((f) => ({ ...f, implantedDevices: e.target.value }))}
              placeholder="e.g. Medtronic Pacemaker (2022), Stent, Cochlear Implant"
            />
          </div>

          {/* Special Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Special Medical Instructions for Responders
            </label>
            <textarea
              className="h-input resize-none"
              rows={2}
              value={form.specialNotes}
              onChange={(e) => setForm((f) => ({ ...f, specialNotes: e.target.value }))}
              placeholder="e.g. Non-verbal under extreme shock, carries EpiPen in backpack..."
            />
          </div>

          {/* Emergency Contacts */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Emergency Contacts
            </label>
            <div className="space-y-2 mb-3">
              {localContacts.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-xl border border-slate-800"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-200">{c.name}</span>
                    <span className="text-xs text-slate-400 ml-2">· {c.relationship}</span>
                    {c.isPrimary && (
                      <span className="ml-2 text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                        PRIMARY
                      </span>
                    )}
                    <div className="text-xs text-slate-400 mt-0.5">
                      <Phone className="w-2.5 h-2.5 inline mr-1 text-slate-500" />
                      {c.phone}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteContact(c._id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {localContacts.length === 0 && (
                <p className="text-xs text-slate-500 italic">No emergency contacts added yet.</p>
              )}
            </div>

            {/* Add Contact Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input
                className="h-input"
                placeholder="Full Name"
                value={contactForm.name}
                onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="h-input"
                placeholder="Relationship"
                value={contactForm.relationship}
                onChange={(e) => setContactForm((f) => ({ ...f, relationship: e.target.value }))}
              />
              <input
                className="h-input"
                placeholder="Phone (e.g. +1 555-0199)"
                value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactForm.isPrimary}
                  onChange={(e) => setContactForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                  className="rounded text-blue-600 bg-slate-800 border-slate-700"
                />
                Mark as primary responder
              </label>
              <button
                type="button"
                onClick={handleAddContact}
                disabled={addingContact}
                className="vault-btn-ghost text-xs py-1.5 px-3"
              >
                <Plus className="w-3.5 h-3.5" />
                {addingContact ? 'Adding…' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-modal-footer">
          <button onClick={onClose} className="vault-btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="vault-btn-action">
            {saving ? 'Saving…' : 'Save Medical Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
