import React, { useState } from 'react';
import { Users, Phone, MessageSquare, Plus, Trash2, Star, ShieldCheck } from 'lucide-react';

const RELATION_TAGS = ['Spouse', 'Parent', 'Doctor / Physician', 'Insurance Provider', 'Sibling', 'Child', 'Friend', 'Other'];

export default function ICEContactsDirectory({
  contacts = [],
  onAddContact,
  onRemoveContact,
  onSetPrimary,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    relation: 'Family',
    phone: '',
    altPhone: '',
    isPrimary: contacts.length === 0,
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;

    onAddContact({
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
    });

    setForm({
      name: '',
      relation: 'Family',
      phone: '',
      altPhone: '',
      isPrimary: false,
      notes: '',
    });
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">ICE Contacts Directory</h3>
            <p className="text-xs text-slate-500">In Case of Emergency — 1-Tap Calling & SMS Dispatch</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? 'Cancel' : 'Add Emergency Contact'}
        </button>
      </div>

      {/* Add Contact Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">New Emergency Contact</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. Sarah Jenkins / John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Relationship</label>
              <select
                value={form.relation}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {RELATION_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Primary Phone (E.164)</label>
              <input
                type="tel"
                placeholder="e.g. +1 555-0199 or +91 9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Alternative Phone (Optional)</label>
              <input
                type="tel"
                placeholder="e.g. Clinic or Office Line"
                value={form.altPhone}
                onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimaryCheckbox"
              checked={form.isPrimary}
              onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isPrimaryCheckbox" className="text-xs font-medium text-slate-700">
              Set as Primary Emergency Contact (first to be notified on SOS)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Save Contact
            </button>
          </div>
        </form>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No ICE contacts added yet</p>
          <p className="text-xs text-slate-400">
            Add at least one immediate family member and your primary physician for one-tap calling.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {contacts.map((contact, idx) => {
            const smsMessage = encodeURIComponent(
              `Emergency Alert: I need assistance. Please call me back or check on me immediately.`
            );

            return (
              <div
                key={contact._id || idx}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  contact.isPrimary
                    ? 'bg-gradient-to-br from-indigo-50/70 to-purple-50/40 border-indigo-200 shadow-xs'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm">{contact.name}</span>
                      {contact.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold">
                          <Star className="w-2.5 h-2.5 fill-white" /> Primary
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 block">{contact.relation}</span>
                    <span className="text-xs font-mono font-semibold text-slate-800 block mt-0.5">
                      {contact.phone}
                    </span>
                    {contact.altPhone && (
                      <span className="text-[11px] text-slate-400 block">Alt: {contact.altPhone}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!contact.isPrimary && (
                      <button
                        type="button"
                        onClick={() => onSetPrimary(idx)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Set as Primary ICE Contact"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveContact(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Remove Contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 1-Tap Trigger Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>

                  <a
                    href={`sms:${contact.phone}?body=${smsMessage}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Send SMS</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
