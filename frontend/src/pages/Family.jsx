import { useEffect, useState } from 'react';
import familyService from '../services/familyService';
import Toast from '../components/Toast';
import './Family.css';

export default function Family() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: '', relation: '', phone: '', notes: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setMembers(await familyService.getFamily()); }
    catch { showToast('Could not load family members.', 'error'); }
    finally { setLoading(false); }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.relation.trim()) return;
    try {
      const created = await familyService.addMember(form);
      setMembers((prev) => [created, ...prev]);
      setForm({ name: '', relation: '', phone: '', notes: '' });
      setShowForm(false);
      showToast('Family member added.');
    } catch { showToast('Could not add family member.', 'error'); }
  };

  const remove = async (id) => {
    await familyService.deleteMember(id);
    setMembers((prev) => prev.filter((m) => m._id !== id));
    showToast('Removed.');
  };

  return (
    <div className="family-page">
      <Toast message={toast?.message} type={toast?.type} />
      <div className="page-header goals-header">
        <div>
          <h1>Family</h1>
          <p className="page-subtitle">Keep your family's contact details in one place.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ Add Family Member'}</button>
      </div>

      {showForm && (
        <form className="card family-form" onSubmit={handleAdd}>
          <div className="family-form-row">
            <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Relation (Mom, Dad, Sister…)" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />
          </div>
          <input className="input" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <textarea className="input" rows={2} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button className="btn btn-primary" type="submit">Save</button>
        </form>
      )}

      {loading ? (
        <div className="panel-loading"><span className="spinner"></span> Loading…</div>
      ) : members.length === 0 ? (
        <div className="card empty-state"><div className="empty-icon">{'\u{1F46A}'}</div><p>No family members added yet.</p></div>
      ) : (
        <div className="family-grid">
          {members.map((m) => (
            <div key={m._id} className="card family-card">
              <div className="family-avatar">{m.name[0]?.toUpperCase()}</div>
              <div className="family-info">
                <p className="family-name">{m.name}</p>
                <p className="family-relation">{m.relation}</p>
                {m.phone && <p className="family-phone">{m.phone}</p>}
                {m.notes && <p className="family-notes">{m.notes}</p>}
              </div>
              <button className="btn-danger" onClick={() => remove(m._id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
