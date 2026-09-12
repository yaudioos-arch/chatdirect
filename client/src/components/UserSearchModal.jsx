import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiUrl } from '../lib/api';
import { X, Search, UserPlus, UserCheck, Clock, MessageSquare, UserX } from 'lucide-react';

export default function UserSearchModal({ onClose }) {
  const { currentUser } = useAuth();
  const { sendFriendRequest, sentRequests, contacts, selectChat, friendRequests, respondToFriendRequest } = useSocket();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingIds, setPendingIds] = useState(new Set());
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(apiUrl(`/api/users/search?q=${encodeURIComponent(q)}&userId=${currentUser.id}`));
      const data = await res.json();
      if (data.users) setResults(data.users);
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  const handleSendRequest = async (user) => {
    setPendingIds((prev) => new Set([...prev, user.id]));
    await sendFriendRequest(user.id);
    // Refresh result status
    setResults((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, friendStatus: 'pending', iAmSender: true } : u
      )
    );
  };

  const handleOpenChat = (user) => {
    const contact = contacts.find((c) => c.id === user.id);
    if (contact) {
      selectChat(contact);
      onClose();
    }
  };

  const handleAcceptInline = async (user) => {
    const req = friendRequests.find((r) => r.sender_id === user.id);
    if (!req) return;
    await respondToFriendRequest(req.id, 'accepted');
    setResults((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, friendStatus: 'accepted' } : u))
    );
  };

  const getStatusChip = (user) => {
    const isFriend = user.friendStatus === 'accepted';
    const isPending = user.friendStatus === 'pending';
    const hasIncoming = friendRequests.some((r) => r.sender_id === user.id);

    if (isFriend) {
      return (
        <button
          onClick={() => handleOpenChat(user)}
          className="flex items-center gap-1.5 text-[11px] font-semibold bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/30 px-3 py-1.5 rounded-lg hover:bg-[#00a884]/25 transition"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Message
        </button>
      );
    }

    if (hasIncoming) {
      return (
        <button
          onClick={() => handleAcceptInline(user)}
          className="flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/25 transition"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Accept
        </button>
      );
    }

    if (isPending && user.iAmSender) {
      return (
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8696a0] border border-[#222d34] px-3 py-1.5 rounded-lg cursor-default">
          <Clock className="w-3.5 h-3.5" />
          Pending
        </span>
      );
    }

    const isSending = pendingIds.has(user.id);
    return (
      <button
        onClick={() => handleSendRequest(user)}
        disabled={isSending}
        className="flex items-center gap-1.5 text-[11px] font-semibold bg-[#202c33] text-[#e9edef] border border-[#222d34] px-3 py-1.5 rounded-lg hover:bg-[#2a3942] transition disabled:opacity-50"
      >
        <UserPlus className="w-3.5 h-3.5 text-[#00a884]" />
        Add Friend
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-[#0b141a]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222d34] bg-[#202c33]">
          <h2 className="text-sm font-bold text-[#e9edef]">Add Friends</h2>
          <button
            onClick={onClose}
            className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-[#222d34]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by username or display name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#202c33] text-[#e9edef] pl-9 pr-4 py-2.5 rounded-xl text-sm placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto divide-y divide-[#222d34]/30">
          {isSearching ? (
            <div className="p-8 text-center text-[#8696a0] text-xs">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              {query.trim() ? (
                <>
                  <UserX className="w-10 h-10 text-[#8696a0] mx-auto mb-2" />
                  <p className="text-xs text-[#8696a0]">No users found for "<span className="text-[#e9edef]">{query}</span>"</p>
                </>
              ) : (
                <>
                  <Search className="w-10 h-10 text-[#8696a0] mx-auto mb-2" />
                  <p className="text-xs text-[#8696a0]">Type a username or name to search</p>
                </>
              )}
            </div>
          ) : (
            results.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#202c33]/60 transition">
                <div className="relative flex-shrink-0">
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.display_name}
                    className="w-11 h-11 rounded-full bg-[#202c33] border border-[#222d34] object-cover p-0.5"
                  />
                  {user.friendStatus === 'accepted' && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#111b21]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#e9edef] truncate">{user.display_name}</p>
                  <p className="text-[11px] text-[#8696a0] truncate">@{user.username}</p>
                  {user.bio && (
                    <p className="text-[11px] text-[#8696a0] truncate mt-0.5 italic">{user.bio}</p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {getStatusChip(user)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
