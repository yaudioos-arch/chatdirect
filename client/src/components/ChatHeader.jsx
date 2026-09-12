import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Search,
  ArrowLeft,
  Info,
  Phone,
  Video,
  Clock,
  Check,
  Pin,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Palette,
  Calendar,
  Lock,
  Image as ImageIcon,
  ShieldAlert
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const DISAPPEARING_OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '10 seconds', seconds: 10 },
  { label: '1 minute', seconds: 60 },
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 }
];

const THEME_ACCENTS = [
  { name: 'Emerald', hex: '#00a884' },
  { name: 'Ocean', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Sunset', hex: '#f97316' },
  { name: 'Ruby', hex: '#f43f5e' }
];

export default function ChatHeader({ onToggleInfo, onToggleSearch, onBackMobile, isInfoOpen, onJumpToDate }) {
  const {
    activeChat,
    typingMap,
    recordingMap,
    disappearingTimer,
    setDisappearingSeconds,
    startCall,
    pinnedMessages,
    togglePin,
    chatSettings,
    updateChatSettingsAction,
    lockChat,
    setChatLockModalContact,
    setWallpaperModalContact
  } = useSocket();

  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showPinnedExpanded, setShowPinnedExpanded] = useState(false);
  const [pinnedIndex, setPinnedIndex] = useState(0);

  if (!activeChat) return null;

  const isTyping = typingMap[activeChat.id];
  const isRecording = recordingMap[activeChat.id];

  const getStatusSubtitle = () => {
    if (isRecording) {
      return (
        <span className="text-rose-400 font-medium flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-ping" />
          recording audio...
        </span>
      );
    }
    if (isTyping) {
      return (
        <span className="text-[#00a884] font-medium flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] inline-block animate-bounce" />
          typing...
        </span>
      );
    }
    if (activeChat.isOnline && activeChat.status !== 'offline') {
      if (activeChat.status === 'away') return <span className="text-amber-400">Away</span>;
      if (activeChat.status === 'dnd') return <span className="text-rose-400">Do Not Disturb</span>;
      return <span className="text-[#00a884]">online</span>;
    }
    if (activeChat.last_seen) {
      try {
        return `last seen ${formatDistanceToNow(new Date(activeChat.last_seen), { addSuffix: true })}`;
      } catch {
        return 'offline';
      }
    }
    return 'offline';
  };

  const getTimerLabel = (sec) => {
    if (!sec || sec === 0) return 'Off';
    if (sec === 10) return '10s';
    if (sec === 60) return '1m';
    if (sec === 3600) return '1h';
    return '24h';
  };

  const handleJumpToPinned = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 1500);
    }
  };

  const activePinnedMsg = pinnedMessages[pinnedIndex % (pinnedMessages.length || 1)];

  return (
    <div className="flex flex-col flex-shrink-0 z-10 select-none">
      <header className="h-16 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 -ml-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar */}
          <div className="relative cursor-pointer" onClick={onToggleInfo}>
            <img
              src={activeChat.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeChat.username}`}
              alt={activeChat.display_name}
              className="w-10 h-10 rounded-full bg-[#111b21] border border-[#222d34] object-cover p-0.5"
            />
            {activeChat.isOnline && activeChat.status !== 'offline' && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#202c33]" />
            )}
          </div>

          {/* Contact Name & Status */}
          <div className="cursor-pointer" onClick={onToggleInfo}>
            <h2 className="font-semibold text-sm text-[#e9edef] leading-tight flex items-center gap-1.5">
              {activeChat.display_name}
              {(chatSettings.is_locked === 1 || activeChat.isLocked) && (
                <Lock className="w-3 h-3 text-amber-400" title="Locked conversation" />
              )}
              {activeChat.isBlockedByMe && (
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-medium border border-rose-500/30">
                  Blocked
                </span>
              )}
              {chatSettings.is_muted === 1 && (
                <VolumeX className="w-3.5 h-3.5 text-[#8696a0]" title="Muted" />
              )}
            </h2>
            <div className="text-xs text-[#8696a0] leading-tight">{getStatusSubtitle()}</div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 text-[#8696a0]">
          {/* 🔒 Screen Lock Button */}
          <button
            onClick={() => {
              if (chatSettings.is_locked === 1 || activeChat.isLocked) {
                lockChat(activeChat.id);
              } else {
                setChatLockModalContact(activeChat);
              }
            }}
            className={`p-2 rounded-lg transition ${
              chatSettings.is_locked === 1 || activeChat.isLocked
                ? 'text-amber-400 hover:bg-[#2a3942]'
                : 'hover:text-[#e9edef] hover:bg-[#2a3942]'
            }`}
            title={
              chatSettings.is_locked === 1 || activeChat.isLocked
                ? 'Lock conversation now'
                : 'Set Screen-Lock PIN'
            }
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* 📞 Voice Call Button */}
          <button
            onClick={() => startCall({ isVideo: false })}
            className="p-2 hover:text-[#00a884] hover:bg-[#2a3942] rounded-lg transition"
            title="Start Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* 📹 Video Call Button */}
          <button
            onClick={() => startCall({ isVideo: true })}
            className="p-2 hover:text-[#00a884] hover:bg-[#2a3942] rounded-lg transition"
            title="Start Video Call"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* 🔕 Mute / Unmute Button */}
          <button
            onClick={() => updateChatSettingsAction({ is_muted: chatSettings.is_muted === 1 ? 0 : 1 })}
            className={`p-2 rounded-lg transition ${
              chatSettings.is_muted === 1 ? 'text-rose-400 bg-[#2a3942]' : 'hover:text-[#e9edef] hover:bg-[#2a3942]'
            }`}
            title={chatSettings.is_muted === 1 ? 'Unmute conversation' : 'Mute conversation'}
          >
            {chatSettings.is_muted === 1 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* 🎨 Chat Theme & Wallpaper Picker */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 hover:text-[#e9edef] hover:bg-[#2a3942] rounded-lg transition"
              title="Change Chat Theme & Wallpaper"
            >
              <Palette className="w-4 h-4" style={{ color: chatSettings.accent_color || '#00a884' }} />
            </button>

            {showThemeMenu && (
              <div
                className="absolute right-0 top-12 w-52 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl p-2.5 z-50 animate-fadeIn text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-1 text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-2">
                  Accent Color
                </div>
                <div className="flex gap-2 justify-center mb-3">
                  {THEME_ACCENTS.map((acc) => (
                    <button
                      key={acc.hex}
                      onClick={() => {
                        updateChatSettingsAction({ accent_color: acc.hex });
                        setShowThemeMenu(false);
                      }}
                      style={{ backgroundColor: acc.hex }}
                      className={`w-6 h-6 rounded-full transition ${
                        chatSettings.accent_color === acc.hex ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={acc.name}
                    />
                  ))}
                </div>

                <div className="border-t border-[#2a3942]/60 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWallpaperModalContact(activeChat);
                      setShowThemeMenu(false);
                    }}
                    className="w-full py-2 px-2.5 bg-[#111b21] hover:bg-[#2a3942] text-[#00a884] font-semibold rounded-lg flex items-center justify-center gap-2 transition border border-[#2a3942]"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Change Wallpaper</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ⏱️ Disappearing Messages Timer Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className={`p-2 rounded-lg transition flex items-center gap-1 ${
                disappearingTimer > 0
                  ? 'text-[#00a884] bg-[#2a3942]'
                  : 'hover:text-[#e9edef] hover:bg-[#2a3942]'
              }`}
              title={`Disappearing Messages: ${getTimerLabel(disappearingTimer)}`}
            >
              <Clock className="w-4 h-4" />
              {disappearingTimer > 0 && (
                <span className="text-[10px] font-bold">{getTimerLabel(disappearingTimer)}</span>
              )}
            </button>

            {showTimerMenu && (
              <div
                className="absolute right-0 top-12 w-48 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 text-[#8696a0] font-semibold border-b border-[#2a3942]/50 mb-1">
                  Disappearing Messages
                </div>
                {DISAPPEARING_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    onClick={() => {
                      setDisappearingSeconds(opt.seconds);
                      setShowTimerMenu(false);
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#111b21] text-left text-[#e9edef]"
                  >
                    <span>{opt.label}</span>
                    {disappearingTimer === opt.seconds && (
                      <Check className="w-3.5 h-3.5 text-[#00a884]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <button
            onClick={onToggleSearch}
            className="p-2 hover:text-[#e9edef] hover:bg-[#2a3942] rounded-lg transition"
            title="Search in conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Contact Info */}
          <button
            onClick={onToggleInfo}
            className={`p-2 hover:text-[#e9edef] hover:bg-[#2a3942] rounded-lg transition ${
              isInfoOpen ? 'text-[#00a884] bg-[#2a3942]' : ''
            }`}
            title="Contact Info & Media"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 📌 Pinned Messages Top Banner */}
      {pinnedMessages.length > 0 && (
        <div className="bg-[#182229] border-b border-[#222d34] px-4 py-2 flex items-center justify-between text-xs animate-fadeIn">
          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
            onClick={() => activePinnedMsg && handleJumpToPinned(activePinnedMsg.id)}
          >
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Pin className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="min-w-0 pr-2">
              <p className="text-[11px] font-bold text-amber-400">
                Pinned Message {pinnedMessages.length > 1 ? `(${pinnedIndex + 1}/${pinnedMessages.length})` : ''}
              </p>
              <p className="text-xs text-[#e9edef] truncate">
                {activePinnedMsg?.content || (activePinnedMsg?.type === 'image' ? '📷 Photo' : '📎 Attachment')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#8696a0]">
            {pinnedMessages.length > 1 && (
              <button
                onClick={() => setPinnedIndex((prev) => (prev + 1) % pinnedMessages.length)}
                className="p-1 hover:text-[#e9edef] hover:bg-[#202c33] rounded transition text-[11px] font-semibold"
                title="Next pinned message"
              >
                Next
              </button>
            )}
            <button
              onClick={() => activePinnedMsg && togglePin(activePinnedMsg.id)}
              className="p-1 hover:text-rose-400 hover:bg-[#202c33] rounded transition"
              title="Unpin"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

