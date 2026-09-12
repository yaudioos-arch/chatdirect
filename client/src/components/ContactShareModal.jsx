import React, { useState } from 'react';
import { X, UserCheck, Phone, Mail } from 'lucide-react';

export default function ContactShareModal({ contacts = [], onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSelectExisting = (c) => {
    setName(c.display_name);
    setPhone(`+1 (555) 019-${Math.floor(1000 + Math.random() * 9000)}`);
    setEmail(`${c.username}@chatdirect.com`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      phone: phone.trim() || 'N/A',
      email: email.trim() || 'N/A'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#222d34]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#00a884]" />
            <h3 className="font-bold text-base text-[#e9edef]">Share Contact</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick select from recent contacts */}
        {contacts.length > 0 && (
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-2">
              Select from Contacts
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectExisting(c)}
                  className="flex items-center gap-1.5 bg-[#202c33] hover:bg-[#2a3942] border border-[#222d34] px-3 py-1.5 rounded-full text-xs text-[#e9edef] transition flex-shrink-0"
                >
                  <img src={c.avatar} alt="" className="w-4 h-4 rounded-full" />
                  <span>{c.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Connor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#202c33] text-[#e9edef] px-3.5 py-2.5 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] pl-10 pr-3.5 py-2.5 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="contact@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] pl-10 pr-3.5 py-2.5 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#8696a0] hover:text-[#e9edef] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-semibold text-xs rounded-xl transition shadow"
            >
              Share Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
