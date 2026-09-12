import React, { useState } from 'react';
import { X, Share2, Search, Check } from 'lucide-react';

export default function ForwardModal({ message, contacts = [], onClose, onForward }) {
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);

  const filtered = contacts.filter((c) =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = () => {
    if (!selectedContact) return;
    onForward(message, selectedContact);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-5 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-[#222d34]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#00a884]" />
            <h3 className="font-bold text-sm text-[#e9edef]">Forward message to...</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="my-3 p-2.5 rounded-xl bg-[#182229] border border-[#222d34] text-xs text-[#8696a0] truncate">
          <span className="text-[#00a884] font-medium block text-[11px] mb-0.5">Message snippet:</span>
          {message.content || (message.type === 'image' ? '📷 Photo' : '📎 Attachment')}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#202c33] text-[#e9edef] pl-9 pr-3 py-2 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
          />
        </div>

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-[#8696a0] text-center py-6">No contacts found</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContact(c)}
                className={`w-full p-2 rounded-xl flex items-center justify-between transition text-left ${
                  selectedContact?.id === c.id
                    ? 'bg-[#00a884]/20 border border-[#00a884]'
                    : 'hover:bg-[#202c33] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={c.avatar} alt="" className="w-8 h-8 rounded-full bg-[#202c33]" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#e9edef] truncate">{c.display_name}</p>
                    <p className="text-[10px] text-[#8696a0] truncate">@{c.username}</p>
                  </div>
                </div>
                {selectedContact?.id === c.id && (
                  <Check className="w-4 h-4 text-[#00a884]" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#222d34] mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[#8696a0] hover:text-[#e9edef] rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedContact}
            onClick={handleSend}
            className={`px-4 py-1.5 font-semibold text-xs rounded-xl transition shadow ${
              selectedContact
                ? 'bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21]'
                : 'bg-[#202c33] text-[#8696a0] cursor-not-allowed'
            }`}
          >
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}
