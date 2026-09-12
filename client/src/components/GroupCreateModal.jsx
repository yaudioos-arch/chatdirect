import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function GroupCreateModal({ onClose }) {
  const { contacts, createGroup, selectChat } = useSocket();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const friends = contacts.filter((contact) => !contact.isGroup);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || selected.length === 0) return;
    setSaving(true);
    try {
      const group = await createGroup(name, selected);
      selectChat(group);
      onClose();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[#2a3942] bg-[#202c33] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#e9edef]"><Users className="h-5 w-5 text-[#00a884]" /> New group</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[#8696a0] hover:bg-[#2a3942]"><X className="h-5 w-5" /></button>
        </div>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Group name" autoFocus
          className="mb-4 w-full rounded-lg bg-[#111b21] px-3 py-2 text-sm text-[#e9edef] outline-none ring-[#00a884] focus:ring-1" />
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8696a0]">Select contacts</p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {friends.map((contact) => (
            <label key={contact.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#2a3942]">
              <input type="checkbox" checked={selected.includes(contact.id)}
                onChange={() => setSelected((ids) => ids.includes(contact.id) ? ids.filter((id) => id !== contact.id) : [...ids, contact.id])}
                className="accent-[#00a884]" />
              <img src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`} alt="" className="h-8 w-8 rounded-full" />
              <span className="text-sm text-[#e9edef]">{contact.display_name}</span>
            </label>
          ))}
          {!friends.length && <p className="py-6 text-center text-xs text-[#8696a0]">Add friends before creating a group.</p>}
        </div>
        <button disabled={saving || !name.trim() || selected.length === 0} className="mt-5 w-full rounded-lg bg-[#00a884] py-2 text-sm font-semibold text-[#111b21] disabled:cursor-not-allowed disabled:opacity-40">
          {saving ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </div>
  );
}
