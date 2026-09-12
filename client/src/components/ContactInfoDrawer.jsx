import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  X,
  Search,
  Image as ImageIcon,
  FileText,
  Star,
  Shield,
  Clock,
  User,
  Calendar,
  Link,
  Filter,
  ExternalLink,
  Download,
  Lock,
  Ban,
  Palette
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';

const DISAPPEARING_OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '10 seconds', seconds: 10 },
  { label: '1 minute', seconds: 60 },
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 }
];

export default function ContactInfoDrawer({ onClose }) {
  const {
    activeChat,
    messages,
    starredMessages,
    setLightboxMedia,
    disappearingTimer,
    setDisappearingSeconds,
    toggleStar,
    chatSettings,
    blockUser,
    unblockUser,
    setChatLockModalContact,
    setWallpaperModalContact
  } = useSocket();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'media' | 'files' | 'links' | 'starred' | 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSenderFilter, setSearchSenderFilter] = useState('all'); // 'all' | 'me' | 'them'
  const [searchDateFilter, setSearchDateFilter] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const actionMessageTimerRef = React.useRef(null);

  if (!activeChat) return null;

  const showActionMessage = (message) => {
    setActionMessage(message);
    if (actionMessageTimerRef.current) clearTimeout(actionMessageTimerRef.current);
    actionMessageTimerRef.current = setTimeout(() => setActionMessage(''), 1800);
  };

  const handleButtonClick = (event) => {
    const button = event.target.closest('button');
    if (!button || !event.currentTarget.contains(button)) return;
    const label = button.getAttribute('aria-label') || button.textContent.trim().replace(/\s+/g, ' ');
    if (label) showActionMessage(label);
  };

  // Media (Images, GIFs, Videos)
  const mediaMessages = messages.filter(
    (m) =>
      (m.type === 'image' ||
        m.type === 'gif' ||
        m.type === 'video' ||
        /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(m.file_url || '')) &&
      m.file_url &&
      !m.is_deleted_everyone
  );

  // Files / Documents (excluding videos)
  const docMessages = messages.filter(
    (m) =>
      m.type === 'file' &&
      !/\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(m.file_url || '') &&
      m.file_url &&
      !m.is_deleted_everyone
  );

  // Links extracted from all messages
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const linkMessages = [];
  messages.forEach((m) => {
    if (m.content && !m.is_deleted_everyone) {
      const matches = m.content.match(urlRegex);
      if (matches) {
        matches.forEach((url) => {
          linkMessages.push({
            id: m.id,
            url,
            createdAt: m.created_at,
            senderId: m.sender_id
          });
        });
      }
    }
  });

  // Advanced search filtering
  const filteredSearchMessages = messages.filter((m) => {
    if (m.is_deleted_everyone) return false;
    const content = (m.content || '').toLowerCase();
    const matchesQuery = !searchQuery.trim() || content.includes(searchQuery.toLowerCase());
    if (!matchesQuery) return false;

    if (searchSenderFilter === 'me' && m.sender_id === activeChat.id) return false;
    if (searchSenderFilter === 'them' && m.sender_id !== activeChat.id) return false;

    if (searchDateFilter) {
      const msgDate = format(new Date(m.created_at), 'yyyy-MM-dd');
      if (msgDate !== searchDateFilter) return false;
    }

    return true;
  });

  const getTimerLabel = (sec) => {
    if (!sec || sec === 0) return 'Off';
    const opt = DISAPPEARING_OPTIONS.find((o) => o.seconds === sec);
    return opt ? opt.label : `${sec}s`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="contact-info-overlay fixed inset-0 z-50 flex h-full w-full items-center justify-center select-none animate-fadeIn">
      <div className="contact-drawer w-full h-full bg-[#111b21] flex flex-col z-20" onClickCapture={handleButtonClick}>
      {/* Drawer Header */}
      <div className="contact-drawer-header h-16 px-4 bg-[#202c33] flex items-center justify-between border-b border-[#222d34]">
        <div>
          <span className="contact-drawer-kicker">Conversation</span>
          <h3 className="font-semibold text-sm text-[#e9edef]">Contact Info</h3>
        </div>
        <button onClick={onClose} aria-label="Close contact info" className="contact-drawer-close p-1.5 hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] rounded-lg transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="contact-drawer-tabs flex border-b border-[#222d34] bg-[#111b21] overflow-x-auto no-scrollbar">
        {[
          { key: 'overview', label: 'Info' },
          { key: 'media', label: `Media (${mediaMessages.length})` },
          { key: 'files', label: `Files (${docMessages.length})` },
          { key: 'links', label: `Links (${linkMessages.length})` },
          { key: 'starred', label: `⭐ ${starredMessages.length}` },
          { key: 'search', label: 'Search' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2.5 text-xs font-semibold text-center transition whitespace-nowrap px-3 flex-shrink-0 ${
              activeTab === tab.key
                ? 'text-[#00a884] border-b-2 border-[#00a884]'
                : 'text-[#8696a0] hover:text-[#e9edef]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="contact-drawer-content flex-1 overflow-hidden p-5 md:p-7">

        {/* ── 1. OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="contact-overview-grid">
            <div className="contact-profile-hero text-center py-2">
              <div className="contact-avatar-wrap">
                <img
                  src={activeChat.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeChat.username}`}
                  alt={activeChat.display_name}
                  className="w-24 h-24 rounded-full mx-auto bg-[#202c33] border-2 border-[#00a884] p-1 object-cover shadow-lg"
                />
                <span className={`contact-presence-dot ${activeChat.isOnline ? 'is-online' : ''}`} />
              </div>
              <h2 className="text-lg font-bold text-[#e9edef] mt-3">{activeChat.display_name}</h2>
              <p className="text-xs text-[#8696a0]">@{activeChat.username}</p>
              <span className={`contact-status-pill ${activeChat.isOnline ? 'is-online' : ''}`}>
                <span /> {activeChat.isOnline ? 'Online now' : 'Offline'}
              </span>
            </div>

            <div className="contact-info-card bg-[#182229] border border-[#222d34] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider block mb-1">About / Bio</span>
              <p className="text-xs text-[#e9edef] leading-relaxed">{activeChat.bio || 'Available for 1-on-1 direct messaging.'}</p>
            </div>

            <div className="contact-info-card bg-[#182229] border border-[#222d34] rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8696a0] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00a884]" />
                  Status
                </span>
                <span className="capitalize font-medium text-[#e9edef]">
                  {activeChat.isOnline ? activeChat.status || 'online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8696a0] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#00a884]" />
                  Privacy
                </span>
                <span className="text-emerald-400 font-medium">1-on-1 Direct Messaging</span>
              </div>
              {actionMessage && (
                <div className="contact-action-toast" role="status">
                  <span className="contact-action-toast-dot" />
                  <span>{actionMessage}</span>
                </div>
              )}
            </div>

            <div className="contact-info-card bg-[#182229] border border-[#222d34] rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Clock className="w-3.5 h-3.5 text-[#00a884]" />
                <span className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider">Disappearing Messages</span>
              </div>
              <p className="text-[11px] text-[#8696a0] mb-3">
                Auto-delete messages after a set time. Currently: <span className="text-[#00a884] font-semibold">{getTimerLabel(disappearingTimer)}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DISAPPEARING_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    onClick={() => setDisappearingSeconds(opt.seconds)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                      disappearingTimer === opt.seconds
                        ? 'bg-[#00a884] text-[#111b21] border-[#00a884]'
                        : 'bg-[#202c33] text-[#8696a0] border-[#2a3942] hover:text-[#e9edef]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Screen Lock */}
            <div className="contact-info-card bg-[#182229] border border-[#222d34] rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-[#e9edef] font-semibold">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Screen Lock</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  chatSettings.is_locked === 1 || activeChat.isLocked
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-[#202c33] text-[#8696a0]'
                }`}>
                  {chatSettings.is_locked === 1 || activeChat.isLocked ? 'Locked' : 'Off'}
                </span>
              </div>
              <p className="text-[11px] text-[#8696a0] mb-3 leading-relaxed">
                Protect this conversation with a 4-digit PIN lock.
              </p>
              <button
                type="button"
                onClick={() => setChatLockModalContact(activeChat)}
                className="w-full py-2 bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-[#e9edef] border border-[#2a3942] rounded-xl transition flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>{chatSettings.is_locked === 1 || activeChat.isLocked ? 'Manage PIN / Unlock' : 'Enable PIN Lock'}</span>
              </button>
            </div>

            {/* Custom Wallpaper */}
            <div className="bg-[#182229] border border-[#222d34] rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-[#e9edef] font-semibold">
                  <Palette className="w-3.5 h-3.5 text-[#00a884]" />
                  <span>Chat Wallpaper</span>
                </div>
                <span className="text-[10px] text-[#8696a0]">
                  {chatSettings.wallpaper || activeChat.wallpaper ? 'Custom' : 'Default'}
                </span>
              </div>
              <p className="text-[11px] text-[#8696a0] mb-3 leading-relaxed">
                Choose a custom theme color, dark preset, or upload an image.
              </p>
              <button
                type="button"
                onClick={() => setWallpaperModalContact(activeChat)}
                className="w-full py-2 bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-[#00a884] border border-[#2a3942] rounded-xl transition flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Change Wallpaper</span>
              </button>
            </div>

            {/* Block / Unblock Contact */}
            <div className="contact-info-card contact-danger-card bg-[#182229] border border-rose-500/20 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-rose-300">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span>Block User</span>
              </div>
              <p className="text-[11px] text-[#8696a0] mb-3 leading-relaxed">
                {activeChat.isBlockedByMe
                  ? 'This user is blocked. They cannot message or call you.'
                  : 'Blocked contacts cannot send you messages or initiate calls.'}
              </p>
              {activeChat.isBlockedByMe ? (
                <button
                  type="button"
                  onClick={() => unblockUser(activeChat.id)}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-400 border border-emerald-500/40 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <span>Unblock {activeChat.display_name}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to block ${activeChat.display_name}?`)) {
                      blockUser(activeChat.id);
                    }
                  }}
                  className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-rose-400 border border-rose-500/30 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Block {activeChat.display_name}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 2. MEDIA TAB (PHOTOS & VIDEOS) ── */}
        {activeTab === 'media' && (
          <div>
            {mediaMessages.length === 0 ? (
              <div className="text-center py-12 text-[#8696a0]">
                <ImageIcon className="w-10 h-10 mx-auto text-[#2a3942] mb-2" />
                <p className="text-xs">No media shared yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {mediaMessages.map((m) => {
                  const isVideo = m.type === 'video' || /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(m.file_url || '');
                  return (
                    <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden group bg-[#202c33]">
                      {isVideo ? (
                        <video
                          src={m.file_url}
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={m.file_url}
                          alt="Shared media"
                          onClick={() => setLightboxMedia(m.file_url)}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                        />
                      )}
                      <div
                        onClick={() => setLightboxMedia(m.file_url)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-end justify-between p-1.5"
                      >
                        <span className="text-[9px] text-white/90 truncate">{format(new Date(m.created_at), 'MMM d')}</span>
                        {isVideo && <span className="text-[9px] bg-black/70 text-white px-1 rounded">Video</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 3. FILES TAB (DOCUMENTS) ── */}
        {activeTab === 'files' && (
          <div className="space-y-2">
            {docMessages.length === 0 ? (
              <div className="text-center py-12 text-[#8696a0]">
                <FileText className="w-10 h-10 mx-auto text-[#2a3942] mb-2" />
                <p className="text-xs">No documents shared yet</p>
              </div>
            ) : (
              docMessages.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-[#182229] hover:bg-[#202c33] border border-[#222d34] rounded-xl transition text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884] flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#e9edef] truncate">{m.file_name || 'Document'}</p>
                      <p className="text-[10px] text-[#8696a0]">{formatFileSize(m.file_size)} • {format(new Date(m.created_at), 'MMM d')}</p>
                    </div>
                  </div>
                  <a
                    href={m.file_url}
                    download={m.file_name || 'download'}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-[#2a3942] rounded-lg text-[#00a884] transition"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── 4. LINKS TAB ── */}
        {activeTab === 'links' && (
          <div className="space-y-2">
            {linkMessages.length === 0 ? (
              <div className="text-center py-12 text-[#8696a0]">
                <Link className="w-10 h-10 mx-auto text-[#2a3942] mb-2" />
                <p className="text-xs">No links shared yet</p>
              </div>
            ) : (
              linkMessages.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2.5 p-3 bg-[#182229] hover:bg-[#202c33] border border-[#222d34] rounded-xl transition text-xs block group"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                    <Link className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#53bdeb] group-hover:underline truncate">{link.url}</p>
                    <p className="text-[10px] text-[#8696a0] mt-0.5">{format(new Date(link.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#8696a0] group-hover:text-white transition flex-shrink-0" />
                </a>
              ))
            )}
          </div>
        )}

        {/* ── 5. STARRED TAB ── */}
        {activeTab === 'starred' && (
          <div className="space-y-2">
            {starredMessages.length === 0 ? (
              <div className="text-center py-12 text-[#8696a0]">
                <Star className="w-10 h-10 mx-auto text-[#2a3942] mb-2" />
                <p className="text-xs">No starred messages</p>
                <p className="text-[11px] text-[#8696a0]/60 mt-1">Right-click or hover a message and star it.</p>
              </div>
            ) : (
              starredMessages.map((msg) => (
                <div key={msg.id} className="bg-[#182229] border border-[#222d34] rounded-xl p-3 text-xs group relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-amber-400 fill-current" />
                      <span className="text-[#8696a0] text-[10px]">
                        {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleStar(msg.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#8696a0] hover:text-amber-400 transition"
                      title="Unstar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {msg.type === 'image' || msg.type === 'gif' ? (
                    <img
                      src={msg.file_url}
                      alt="Media"
                      className="w-full rounded-lg max-h-36 object-cover cursor-pointer"
                      onClick={() => msg.type === 'image' && setLightboxMedia(msg.file_url)}
                    />
                  ) : (
                    <p className="text-[#e9edef] line-clamp-3 leading-relaxed">{msg.content}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── 6. ADVANCED SEARCH TAB ── */}
        {activeTab === 'search' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] pl-9 pr-3 py-2 rounded-xl text-xs placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>

            {/* Filter controls */}
            <div className="flex gap-2 text-[11px]">
              <select
                value={searchSenderFilter}
                onChange={(e) => setSearchSenderFilter(e.target.value)}
                className="flex-1 bg-[#202c33] text-[#e9edef] p-1.5 rounded-lg border border-[#2a3942] focus:outline-none"
              >
                <option value="all">All Senders</option>
                <option value="me">Sent by Me</option>
                <option value="them">Sent by {activeChat.display_name}</option>
              </select>

              <input
                type="date"
                value={searchDateFilter}
                onChange={(e) => setSearchDateFilter(e.target.value)}
                className="bg-[#202c33] text-[#e9edef] p-1.5 rounded-lg border border-[#2a3942] focus:outline-none"
              />
            </div>

            {/* Results */}
            {filteredSearchMessages.length === 0 ? (
              <p className="text-xs text-[#8696a0] text-center py-6">No matching messages found</p>
            ) : (
              filteredSearchMessages.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    const el = document.getElementById(`msg-${m.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-[#00a884]');
                      setTimeout(() => el.classList.remove('ring-2', 'ring-[#00a884]'), 1500);
                    }
                  }}
                  className="p-2.5 bg-[#182229] hover:bg-[#202c33] border border-[#222d34] rounded-xl text-xs cursor-pointer transition"
                >
                  <div className="flex justify-between text-[10px] text-[#8696a0] mb-1">
                    <span className="font-semibold text-[#00a884]">
                      {m.sender_id === activeChat.id ? activeChat.display_name : 'You'}
                    </span>
                    <span>{format(new Date(m.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="text-[#e9edef] line-clamp-2">{m.content || (m.type === 'image' ? '📷 Photo' : '📎 Attachment')}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
