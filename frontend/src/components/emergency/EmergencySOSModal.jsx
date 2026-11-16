import React, { useState } from 'react';
import { AlertTriangle, Phone, MessageSquare, Send, X, ShieldAlert } from 'lucide-react';

export default function EmergencySOSModal({
  isOpen,
  onClose,
  profile = {},
  contacts = [],
}) {
  if (!isOpen) return null;

  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0] || null;

  // Generate standardized emergency alert message
  const emergencyMessage = encodeURIComponent(
    `🚨 EMERGENCY SOS: I need immediate assistance!

Medical Profile:
• Blood Group: ${profile.bloodGroup || 'Not specified'}
• Severe Allergies: ${profile.allergies || 'None reported'}
• Chronic Conditions: ${profile.chronicConditions || 'None reported'}
• Emergency Notes: ${profile.medicalNotes || 'Please contact family immediately.'}

Emergency Contacts:
${contacts
  .slice(0, 3)
  .map((c) => `• ${c.name} (${c.relation}): ${c.phone}`)
  .join('\n')}

Sent via LifeVault SOS Dispatch.`
  );

  const whatsappUrl = primaryContact
    ? `https://wa.me/${primaryContact.phone.replace(/[^0-9]/g, '')}?text=${emergencyMessage}`
    : `https://wa.me/?text=${emergencyMessage}`;

  const smsUrl = primaryContact
    ? `sms:${primaryContact.phone}?body=${emergencyMessage}`
    : `sms:?body=${emergencyMessage}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-rose-500 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Emergency SOS Dispatch</h2>
              <p className="text-xs text-rose-100">Broadcast alert or dial emergency dispatchers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Action 1: Instant WhatsApp Broadcast */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              One-Tap Panic Broadcast
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp SOS Alert</span>
              </a>

              <a
                href={smsUrl}
                className="flex items-center justify-center gap-2 p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-sm transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>SMS Alert Dispatch</span>
              </a>
            </div>
          </div>

          {/* Action 2: Offline Emergency Authority Hotlines */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Local Offline Emergency Dials (Works without Internet)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href="tel:112"
                className="p-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl text-center space-y-1 block transition-colors"
              >
                <Phone className="w-4 h-4 text-rose-600 mx-auto" />
                <span className="text-xs font-black text-rose-900 block">112</span>
                <span className="text-[10px] text-rose-700 font-medium block">All SOS</span>
              </a>

              <a
                href="tel:108"
                className="p-3 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl text-center space-y-1 block transition-colors"
              >
                <Phone className="w-4 h-4 text-red-600 mx-auto" />
                <span className="text-xs font-black text-red-900 block">108 / 102</span>
                <span className="text-[10px] text-red-700 font-medium block">Ambulance</span>
              </a>

              <a
                href="tel:100"
                className="p-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl text-center space-y-1 block transition-colors"
              >
                <Phone className="w-4 h-4 text-blue-600 mx-auto" />
                <span className="text-xs font-black text-blue-900 block">100 / 911</span>
                <span className="text-[10px] text-blue-700 font-medium block">Police</span>
              </a>

              <a
                href="tel:101"
                className="p-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl text-center space-y-1 block transition-colors"
              >
                <Phone className="w-4 h-4 text-amber-600 mx-auto" />
                <span className="text-xs font-black text-amber-900 block">101</span>
                <span className="text-[10px] text-amber-700 font-medium block">Fire Dept</span>
              </a>
            </div>
          </div>

          {/* Primary ICE Contact Banner */}
          {primaryContact ? (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Primary Emergency Contact
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {primaryContact.name} ({primaryContact.relation})
                </p>
                <p className="text-xs text-slate-500">{primaryContact.phone}</p>
              </div>
              <a
                href={`tel:${primaryContact.phone}`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                Call Now
              </a>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center italic">
              No emergency contacts configured yet. Add your family or physician below.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
