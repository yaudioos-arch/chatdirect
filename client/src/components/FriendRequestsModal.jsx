import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { X, UserCheck, UserX, Clock, Users, Send, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function FriendRequestsModal({ onClose }) {
  const { friendRequests, sentRequests, respondToFriendRequest } = useSocket();
  const [activeTab, setActiveTab] = useState('received');
  const [processing, setProcessing] = useState(new Set());
  const [responded, setResponded] = useState({}); // requestId -> 'accepted' | 'declined'

  const handleRespond = async (requestId, status) => {
    setProcessing((prev) => new Set([...prev, requestId]));
    try {
      await respondToFriendRequest(requestId, status);
      setResponded((prev) => ({ ...prev, [requestId]: status }));
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return format(new Date(ts), 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  const pendingReceived = friendRequests.filter((r) => !responded[r.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-[#0b141a]/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222d34] bg-[#202c33]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00a884]" />
            <h2 className="text-sm font-bold text-[#e9edef]">Friend Requests</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#222d34]">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'received'
                ? 'border-[#00a884] text-[#00a884]'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            Received
            {pendingReceived.length > 0 && (
              <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingReceived.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'sent'
                ? 'border-[#00a884] text-[#00a884]'
                : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            Sent
            {sentRequests.length > 0 && (
              <span className="bg-[#202c33] text-[#8696a0] text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-[#222d34]">
                {sentRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[28rem] overflow-y-auto">
          {activeTab === 'received' ? (
            pendingReceived.length === 0 ? (
              <div className="p-10 text-center">
                <UserCheck className="w-10 h-10 text-[#8696a0] mx-auto mb-2" />
                <p className="text-xs text-[#8696a0]">No pending friend requests</p>
              </div>
            ) : (
              pendingReceived.map((req) => {
                const isProcessing = processing.has(req.id);
                const didRespond = responded[req.id];
                return (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#202c33]/60 transition border-b border-[#222d34]/20 last:border-0">
                    <img
                      src={req.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.sender_username}`}
                      alt={req.sender_display_name}
                      className="w-11 h-11 rounded-full bg-[#202c33] border border-[#222d34] object-cover p-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#e9edef] truncate">{req.sender_display_name}</p>
                      <p className="text-[11px] text-[#8696a0]">@{req.sender_username}</p>
                      <p className="text-[10px] text-[#8696a0] mt-0.5">{formatTime(req.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {didRespond ? (
                        <span className={`text-[11px] flex items-center gap-1 font-semibold ${
                          didRespond === 'accepted' ? 'text-emerald-400' : 'text-[#8696a0]'
                        }`}>
                          <Check className="w-3.5 h-3.5" />
                          {didRespond === 'accepted' ? 'Accepted' : 'Declined'}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRespond(req.id, 'accepted')}
                            disabled={isProcessing}
                            className="flex items-center gap-1 text-[11px] font-semibold bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespond(req.id, 'declined')}
                            disabled={isProcessing}
                            className="flex items-center gap-1 text-[11px] font-semibold bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] px-3 py-1.5 rounded-lg border border-[#222d34] transition disabled:opacity-60"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            sentRequests.length === 0 ? (
              <div className="p-10 text-center">
                <Send className="w-10 h-10 text-[#8696a0] mx-auto mb-2" />
                <p className="text-xs text-[#8696a0]">No pending sent requests</p>
              </div>
            ) : (
              sentRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#202c33]/60 transition border-b border-[#222d34]/20 last:border-0">
                  <img
                    src={req.receiver_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.receiver_username}`}
                    alt={req.receiver_display_name}
                    className="w-11 h-11 rounded-full bg-[#202c33] border border-[#222d34] object-cover p-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#e9edef] truncate">{req.receiver_display_name}</p>
                    <p className="text-[11px] text-[#8696a0]">@{req.receiver_username}</p>
                    <p className="text-[10px] text-[#8696a0] mt-0.5">{formatTime(req.created_at)}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#8696a0] border border-[#222d34] bg-[#202c33] px-3 py-1.5 rounded-lg flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    Pending
                  </span>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
