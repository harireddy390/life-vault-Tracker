import { useEffect, useState } from 'react';
import emergencyService from '../services/emergencyService';
import Toast from '../components/Toast';
import './Emergency.css';

export default function Emergency() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bloodGroup: '', allergies: '', medicalNotes: '' });
  const [contactForm, setContactForm] = useState({ name: '', relation: '', phone: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await emergencyService.getProfile();
      setProfile(data);
      setForm({ bloodGroup: data.bloodGroup || '', allergies: data.allergies || '', medicalNotes: data.medicalNotes || '' });
    } catch { showToast('Could not load emergency profile.', 'error'); }
    finally { setLoading(false); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    try {
      const updated = await emergencyService.updateProfile({ ...form, contacts: profile.contacts });
      setProfile(updated);
      setEditing(false);
      showToast('Emergency info saved.');
    } catch { showToast('Could not save.', 'error'); }
  };

  const addContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim()) return;
    const contacts = [...(profile.contacts || []), contactForm];
    const updated = await emergencyService.updateProfile({ ...form, contacts });
    setProfile(updated);
    setContactForm({ name: '', relation: '', phone: '' });
  };

  const removeContact = async (idx) => {
    const contacts = profile.contacts.filter((_, i) => i !== idx);
    const updated = await emergencyService.updateProfile({ ...form, contacts });
    setProfile(updated);
  };

  if (loading) return <div className="panel-loading"><span className="spinner"></span> Loading…</div>;

  return (
    <div className="emergency-page">
      <Toast message={toast?.message} type={toast?.type} />
      <div className="page-header">
        <h1>Emergency</h1>
        <p className="page-subtitle">Fast access to what matters most in a crisis.</p>
      </div>

      <div className="card emergency-banner">
        <h2>In Case of Emergency</h2>
        <p>Quick access to important information</p>
      </div>

      <div className="emergency-grid">
        <div className="card panel">
          <div className="panel-top-row">
            <p className="panel-eyebrow">Medical Information</p>
            <button className="btn btn-ghost small-btn" onClick={() => setEditing((v) => !v)}>{editing ? 'Cancel' : 'Edit'}</button>
          </div>
          {editing ? (
            <form className="emergency-form" onSubmit={saveDetails}>
              <input className="input" placeholder="Blood group (e.g. O+ve)" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
              <input className="input" placeholder="Allergies" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
              <textarea className="input" rows={3} placeholder="Other medical notes" value={form.medicalNotes} onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })} />
              <button className="btn btn-primary" type="submit">Save</button>
            </form>
          ) : (
            <div className="medical-info">
              <div className="medical-row"><span>Blood Group</span><strong>{profile.bloodGroup || '—'}</strong></div>
              <div className="medical-row"><span>Allergies</span><strong>{profile.allergies || '—'}</strong></div>
              <div className="medical-row"><span>Notes</span><strong>{profile.medicalNotes || '—'}</strong></div>
            </div>
          )}
        </div>

        <div className="card panel">
          <p className="panel-eyebrow">Emergency Contacts</p>
          {profile.contacts?.length === 0 ? (
            <div className="empty-state"><p>No contacts added yet.</p></div>
          ) : (
            <ul className="contact-list">
              {profile.contacts.map((c, i) => (
                <li key={i} className="contact-row">
                  <div>
                    <p className="contact-name">{c.name} <span className="contact-relation">{c.relation}</span></p>
                    <p className="contact-phone">{c.phone}</p>
                  </div>
                  <button className="btn-danger" onClick={() => removeContact(i)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
          <form className="contact-form" onSubmit={addContact}>
            <input className="input" placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
            <input className="input" placeholder="Relation" value={contactForm.relation} onChange={(e) => setContactForm({ ...contactForm, relation: e.target.value })} />
            <input className="input" placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
            <button className="btn btn-secondary" type="submit">+ Add Contact</button>
          </form>
        </div>
      </div>
    </div>
  );
}
