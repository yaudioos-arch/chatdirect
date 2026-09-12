import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Check,
  CheckCheck,
  Play,
  Pause,
  FileText,
  Download,
  Smile,
  Reply,
  Trash2,
  CornerDownRight,
  Star,
  Clock,
  Pin,
  Edit2,
  BarChart2,
  MapPin,
  UserCheck,
  ExternalLink,
  Ban,
  Share2,
  Eye,
  EyeOff,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import ContextMenu from './ContextMenu';
import ForwardModal from './ForwardModal';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '👏'];

// Simple markdown formatter helper for bold, italic, strikethrough, and code
function formatMarkdown(text) {
  if (!text) return text;

  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).trim();
      return (
        <pre key={index} className="bg-[#111b21] p-2.5 rounded-lg my-1.5 font-mono text-xs overflow-x-auto border border-[#2a3942]/60 text-emerald-300">
          <code>{code}</code>
        </pre>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const inlineCode = part.slice(1, -1);
      return (
        <code key={index} className="bg-[#111b21] px-1.5 py-0.5 rounded font-mono text-xs text-amber-300 border border-[#2a3942]/40">
          {inlineCode}
        </code>
      );
    }

    // Bold, italic, strikethrough, and URLs inside regular text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const tokens = part.split(urlRegex);

    return (
      <span key={index}>
        {tokens.map((token, tIdx) => {
          if (token.match(urlRegex)) {
            return (
              <a
                key={tIdx}
                href={token}
                target="_blank"
                rel="noreferrer"
                className="text-[#53bdeb] hover:underline break-all inline-flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {token}
                <ExternalLink className="w-2.5 h-2.5 inline opacity-70" />
              </a>
            );
          }

          // Apply bold (* or **) and strikethrough (~)
          let formattedStr = token;
          return (
            <span key={tIdx} dangerouslySetInnerHTML={{
              __html: formattedStr
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/~(.*?)~/g, '<del>$1</del>')
            }} />
          );
        })}
      </span>
    );
  });
}

export default function MessageItem({ message }) {
  const { currentUser } = useAuth();
  const {
    contacts,
    toggleReaction,
    deleteMessageMode,
    setReplyingTo,
    setLightboxMedia,
    toggleStar,
    togglePin,
    votePoll,
    editMessageContent,
    sendMessage,
    selectedMessageIds,
    toggleMessageSelection,
    isSelectionMode,
    consumeOneTimeMedia,
    setEditHistoryModalMsg
  } = useSocket();

  const isMe = message.sender_id === currentUser?.id;
  const [showPicker, setShowPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content || '');

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(() => {
    const saved = localStorage.getItem('chat_voice_speed');
    return saved ? parseFloat(saved) : 1;
  });
  const audioRef = useRef(null);

  const formattedTime = format(new Date(message.created_at), 'h:mm a');
  const isViewOnce = Boolean(message.metadata?.view_once);
  const viewedByList = Array.isArray(message.one_time_viewed_by)
    ? message.one_time_viewed_by
    : (() => { try { return JSON.parse(message.one_time_viewed_by || '[]'); } catch { return []; } })();
  const wasViewed = viewedByList.includes(currentUser?.id);
  const recipientViewed = isMe && viewedByList.length > 0;

  const jumpToRepliedMessage = () => {
    const target = document.getElementById(`msg-${message.reply_to_id}`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('message-jump-highlight');
    window.setTimeout(() => target.classList.remove('message-jump-highlight'), 1400);
  };

  // Sync audio playback rate when speed or audio element changes
  // Handle Voice Note Playback
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = audioSpeed;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const duration = audioRef.current.duration || message.audio_duration || 1;
    setAudioCurrentTime(current);
    setAudioProgress((current / duration) * 100);
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
  };

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Disappearing timer countdown display
  const getExpiresIn = () => {
    if (!message.expires_at) return null;
    const remaining = Math.max(0, Math.floor((message.expires_at - Date.now()) / 1000));
    if (remaining <= 0) return null;
    if (remaining < 60) return `${remaining}s`;
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
    return `${Math.floor(remaining / 3600)}h`;
  };

  const expiresIn = getExpiresIn();

  // Group reactions by emoji
  const reactionCounts = {};
  if (message.reactions && message.reactions.length > 0) {
    message.reactions.forEach((r) => {
      if (!reactionCounts[r.emoji]) {
        reactionCounts[r.emoji] = { count: 0, users: [], hasReacted: false };
      }
      reactionCounts[r.emoji].count += 1;
      reactionCounts[r.emoji].users.push(r.userId);
      if (r.userId === currentUser?.id) {
        reactionCounts[r.emoji].hasReacted = true;
      }
    });
  }

  // Right-click context menu handler
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Double-click to react with heart
  const handleDoubleClick = () => {
    toggleReaction(message.id, '❤️');
  };

  // Copy message text
  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
  };

  // Copy direct message link
  const handleCopyLink = () => {
    const link = `${window.location.origin}/#msg-${message.id}`;
    navigator.clipboard.writeText(link);
  };

  // Submit edited message
  const handleSaveEdit = (e) => {
    e.preventDefault();
    const clean = editDraft.trim();
    if (!clean) return;
    editMessageContent(message.id, clean);
    setIsEditing(false);
  };

  // Forward message to contact
  const handleForwardMessage = (msg, targetContact) => {
    sendMessage({
      content: msg.content,
      type: msg.type,
      fileUrl: msg.file_url,
      fileName: msg.file_name,
      fileSize: msg.file_size,
      audioDuration: msg.audio_duration,
      metadata: msg.metadata
    });
  };

  const isGif = message.type === 'gif' || (message.file_url && message.file_url.includes('giphy.com'));
  const isDeletedEveryone = message.is_deleted_everyone === 1;

  return (
    <div
      id={`msg-${message.id}`}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
      className={`group relative flex flex-col mb-1.5 px-4 ${
        isMe ? 'items-end' : 'items-start'
      }`}
    >
      <button
        type="button"
        onClick={() => toggleMessageSelection(message.id)}
        className={`absolute left-1.5 top-3 z-30 w-5 h-5 rounded-full border flex items-center justify-center transition shadow-sm ${
          selectedMessageIds.includes(message.id)
            ? 'border-[#00a884] bg-[#00a884] text-[#111b21]'
            : isSelectionMode
            ? 'border-[#8696a0] bg-[#202c33] text-transparent hover:border-[#00a884]'
            : 'border-[#8696a0] bg-[#202c33] text-transparent opacity-0 group-hover:opacity-100 hover:border-[#00a884]'
        }`}
        title={selectedMessageIds.includes(message.id) ? 'Deselect message' : 'Select message'}
      >
        <Check className="w-3 h-3 stroke-[3]" />
      </button>

      {/* Floating Action Menu on Hover */}
      <div
        className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20 ${
          isMe ? 'right-4 -translate-y-4' : 'left-4 -translate-y-4'
        }`}
      >
        <div className="flex items-center gap-0.5 bg-[#202c33] border border-[#2a3942] rounded-full px-1.5 py-0.5 shadow-xl">
          {/* Reaction Picker Button */}
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="p-1 hover:text-[#00a884] text-[#8696a0] rounded-full transition"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showPicker && (
              <div
                className="absolute bottom-7 left-0 bg-[#202c33] border border-[#2a3942] rounded-full px-2 py-1 flex items-center gap-1.5 shadow-2xl z-30 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      toggleReaction(message.id, emoji);
                      setShowPicker(false);
                    }}
                    className="hover:scale-125 transition text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply Button */}
          <button
            onClick={() => setReplyingTo(message)}
            className="p-1 hover:text-[#00a884] text-[#8696a0] rounded-full transition"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          {/* Star / Bookmark Button */}
          <button
            onClick={() => toggleStar(message.id)}
            className={`p-1 rounded-full transition ${
              message.is_starred === 1
                ? 'text-amber-400 hover:text-amber-300'
                : 'hover:text-amber-400 text-[#8696a0]'
            }`}
            title={message.is_starred === 1 ? 'Unstar message' : 'Star message'}
          >
            <Star className={`w-3.5 h-3.5 ${message.is_starred === 1 ? 'fill-current' : ''}`} />
          </button>

          {/* Pin Button */}
          <button
            onClick={() => togglePin(message.id)}
            className={`p-1 rounded-full transition ${
              message.is_pinned === 1
                ? 'text-amber-400 hover:text-amber-300'
                : 'hover:text-amber-400 text-[#8696a0]'
            }`}
            title={message.is_pinned === 1 ? 'Unpin message' : 'Pin message'}
          >
            <Pin className={`w-3.5 h-3.5 ${message.is_pinned === 1 ? 'fill-current' : ''}`} />
          </button>

          {/* Forward Button */}
          <button
            onClick={() => setShowForwardModal(true)}
            className="p-1 hover:text-[#00a884] text-[#8696a0] rounded-full transition"
            title="Forward"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => deleteMessageMode(message.id, isMe ? 'for_everyone' : 'for_me')}
            className="p-1 hover:text-rose-400 text-[#8696a0] rounded-full transition"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Starred & Pinned Status Indicators */}
      <div className={`flex items-center gap-2 mb-0.5 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
        {message.is_pinned === 1 && (
          <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
            <Pin className="w-2.5 h-2.5 fill-current" />
            Pinned
          </span>
        )}
        {message.is_starred === 1 && (
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <Star className="w-2.5 h-2.5 fill-current" />
            Starred
          </span>
        )}
      </div>

      {/* Message Bubble Container */}
      <div
        className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-2.5 px-3 shadow-md text-sm leading-relaxed transition ${
          isDeletedEveryone
            ? 'bg-[#182229] text-[#8696a0] italic border border-[#222d34]'
            : isMe
            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none chat-bubble-tail-out'
            : 'bg-[#202c33] text-[#e9edef] rounded-tl-none chat-bubble-tail-in'
        }`}
      >
        {/* Quoted Reply Preview */}
        {message.reply_to_id && message.reply_content && !isDeletedEveryone && (
          <div
            onClick={jumpToRepliedMessage}
            className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${
              isMe
                ? 'bg-[#00473a] border-[#00a884] text-[#8696a0]'
                : 'bg-[#182229] border-[#00a884] text-[#8696a0]'
            } cursor-pointer transition hover:brightness-110`}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') jumpToRepliedMessage();
            }}
          >
            <div className="flex items-center gap-1 font-semibold text-[#00a884] mb-0.5">
              <CornerDownRight className="w-3 h-3" />
              <span>{message.reply_sender_name || 'Replied message'}</span>
            </div>
            <p className="truncate text-[#e9edef]">{message.reply_content}</p>
          </div>
        )}

        {/* Deleted Message Placeholder */}
        {isDeletedEveryone ? (
          <div className="flex items-center gap-2 py-1">
            <Ban className="w-4 h-4 text-[#8696a0]" />
            <span>This message was deleted</span>
          </div>
        ) : (
          <>
            {message.metadata?.kind === 'story_reply' && (
              <div className={`mb-2 flex items-center gap-2 rounded-lg border-l-4 px-2.5 py-2 text-xs ${
                isMe
                  ? 'border-[#8b89ff] bg-[#00473a] text-[#d9d8ff]'
                  : 'border-[#8b89ff] bg-[#182229] text-[#c9c7ff]'
              }`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8b89ff]/20 text-sm">◉</span>
                <span>
                  <strong className="block font-semibold">Story reply</strong>
                  <span className="text-[10px] opacity-75">Reply to your story</span>
                </span>
              </div>
            )}

            {/* View Once Media Card (Sender or Recipient) */}
            {isViewOnce ? (
              isMe ? (
                <div className="flex items-center gap-2.5 py-1 px-1 min-w-[160px]">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-[#00a884] bg-[#00a884]/10 flex items-center justify-center font-bold text-xs text-[#00a884] flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-[#e9edef] flex items-center gap-1.5">
                      <span>{message.type === 'video' ? 'Video' : 'Photo'}</span>
                      <span className="text-[10px] text-[#00a884] font-medium bg-[#00a884]/15 px-1.5 py-0.2 rounded-full">View once</span>
                    </p>
                    <p className="text-[10px] text-[#8696a0] mt-0.5">
                      {recipientViewed ? (
                        <span className="text-[#53bdeb] flex items-center gap-1 font-medium">
                          <CheckCheck className="w-3 h-3" /> Opened
                        </span>
                      ) : (
                        'Sent • View once'
                      )}
                    </p>
                  </div>
                </div>
              ) : wasViewed ? (
                <div className="flex items-center gap-2.5 py-1 px-1 text-xs text-[#8696a0] min-w-[160px]">
                  <div className="w-8 h-8 rounded-full border-2 border-[#8696a0]/40 flex items-center justify-center font-bold text-xs text-[#8696a0] flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-[#8696a0] flex items-center gap-1.5">
                      <span>Opened</span>
                      <CheckCheck className="w-3 h-3 text-[#8696a0]" />
                    </p>
                    <p className="text-[10px] text-[#8696a0]/70">Photo/video has expired</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    consumeOneTimeMedia(message.id);
                    setLightboxMedia(message.file_url);
                  }}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl bg-black/20 hover:bg-black/35 border border-[#00a884]/40 transition text-left group/vo min-w-[170px]"
                >
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#00a884] bg-[#00a884]/15 flex items-center justify-center font-bold text-xs text-[#00a884] flex-shrink-0 group-hover/vo:scale-105 transition">
                    1
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-[#e9edef] flex items-center gap-1">
                      <span>{message.type === 'video' ? 'Video' : 'Photo'}</span>
                      <span className="text-[10px] bg-[#00a884]/20 text-[#00a884] px-1.5 py-0.2 rounded font-medium">View once</span>
                    </p>
                    <p className="text-[11px] text-[#00a884] flex items-center gap-1 font-medium">
                      <Eye className="w-3 h-3" /> Tap to view
                    </p>
                  </div>
                </button>
              )
            ) : (
              <>
                {/* Content Type: GIF or Regular Image */}
                {((message.type === 'image' || message.type === 'gif' || isGif) && !(/\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(message.file_url || '')) && message.type !== 'video') && message.file_url && (
                  <div className="mb-1 rounded-xl overflow-hidden cursor-pointer">
                    <img
                      src={message.file_url}
                      alt="Sent attachment"
                      onClick={() => !isGif && setLightboxMedia(message.file_url)}
                      className={`max-h-64 max-w-[360px] object-cover rounded-xl transition ${
                        isGif ? 'cursor-default' : 'hover:opacity-95 cursor-pointer'
                      }`}
                    />
                    {isGif && (
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                        GIF
                      </span>
                    )}
                  </div>
                )}

                {/* Content Type: Video with Live Player & Preview */}
                {message.type !== 'audio' && (message.type === 'video' || /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(message.file_url || '')) && message.file_url && (
                  <div className="mb-1 rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    <video
                      src={message.file_url}
                      controls
                      preload="metadata"
                      playsInline
                      className="max-h-64 max-w-[360px] rounded-xl bg-black object-contain"
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}
              </>
            )}

            {/* Content Type: Voice Note Audio */}
            {message.type === 'audio' && message.file_url && (
              <div className="voice-message-compact flex min-w-[220px] max-w-[270px] flex-col gap-2 py-1">
                <audio
                  ref={audioRef}
                  src={message.file_url}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={handleAudioEnded}
                  preload="metadata"
                  aria-hidden="true"
                  hidden
                  style={{ display: 'none' }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlayAudio}
                    className="h-9 w-9 rounded-full flex items-center justify-center transition flex-shrink-0 bg-white text-[#00a884]"
                    aria-label={isPlayingAudio ? 'Pause voice message' : 'Play voice message'}
                  >
                    {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <div
                    className="voice-waveform flex h-6 flex-1 items-center gap-[3px] cursor-pointer"
                    onClick={(e) => {
                      if (!audioRef.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;
                      const duration = audioRef.current.duration || message.audio_duration || 1;
                      audioRef.current.currentTime = pos * duration;
                    }}
                  >
                    {Array.from({ length: 25 }, (_, index) => (
                      <span
                        key={index}
                        className="voice-waveform-bar"
                        style={{
                          height: `${7 + ((index * 13) % 13)}px`,
                          opacity: index / 25 < audioProgress / 100 ? 1 : 0.72
                        }}
                      />
                    ))}
                    <span className="voice-duration-pill">{formatAudioTime(message.audio_duration)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Content Type: Document / File */}
            {message.type === 'file' && !(/\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(message.file_url || '')) && message.file_url && (
              <div
                className={`flex items-center justify-between gap-3 p-2.5 rounded-xl mb-1 ${
                  isMe ? 'bg-[#00473a]' : 'bg-[#182229]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884] flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#e9edef] truncate">{message.file_name || 'Attachment'}</p>
                    <p className="text-[10px] text-[#8696a0]">{formatFileSize(message.file_size)}</p>
                  </div>
                </div>
                <a
                  href={message.file_url}
                  download={message.file_name || 'download'}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-[#202c33] hover:bg-[#2a3942] rounded-lg text-[#00a884] transition"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Content Type: Interactive Poll */}
            {message.type === 'poll' && message.metadata && (
              <div className="min-w-[240px] sm:min-w-[280px] p-2 space-y-2">
                <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <BarChart2 className="w-4 h-4 text-[#00a884]" />
                  <span className="font-semibold text-xs text-[#e9edef]">{message.metadata.question}</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {message.metadata.options?.map((opt) => {
                    const totalVotes = message.metadata.options.reduce((acc, o) => acc + (o.voters?.length || 0), 0);
                    const optVotes = opt.voters?.length || 0;
                    const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                    const hasVoted = opt.voters?.includes(currentUser?.id);

                    return (
                      <button
                        key={opt.id}
                        onClick={() => votePoll(message.id, opt.id)}
                        className={`w-full text-left p-2 rounded-xl transition relative overflow-hidden border ${
                          hasVoted
                            ? 'border-[#00a884] bg-[#00a884]/20 font-semibold'
                            : 'border-white/10 bg-black/20 hover:border-[#00a884]/60'
                        }`}
                      >
                        {/* Vote progress fill bar */}
                        <div
                          className="absolute inset-0 bg-[#00a884]/25 transition-all duration-300 pointer-events-none"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between z-10 text-xs">
                          <span className="truncate pr-2">{opt.text}</span>
                          <span className="text-[11px] text-[#8696a0] font-mono">{pct}% ({optVotes})</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-[#8696a0] text-right pt-0.5">
                  {message.metadata.options?.reduce((acc, o) => acc + (o.voters?.length || 0), 0)} votes
                </div>
              </div>
            )}

            {/* Content Type: Location Card */}
            {message.type === 'location' && message.metadata && (
              <div className="min-w-[240px] p-2 bg-[#182229] border border-[#222d34] rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#e9edef] truncate">{message.metadata.name}</p>
                    <p className="text-[10px] text-[#8696a0] truncate">{message.metadata.address}</p>
                  </div>
                </div>
                <a
                  href={`https://maps.google.com/?q=${message.metadata.lat},${message.metadata.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 bg-[#202c33] hover:bg-[#2a3942] rounded-lg text-center text-xs text-[#00a884] font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Google Maps
                </a>
              </div>
            )}

            {/* Content Type: Shared Contact */}
            {message.type === 'contact' && message.metadata && (
              <div className="min-w-[220px] p-2.5 bg-[#182229] border border-[#222d34] rounded-xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#e9edef] truncate">{message.metadata.name}</p>
                    <p className="text-[10px] text-[#8696a0] truncate">{message.metadata.phone}</p>
                  </div>
                </div>
                <div className="pt-1 border-t border-[#222d34]/60 text-[10px] text-[#8696a0]">
                  <span>{message.metadata.email}</span>
                </div>
              </div>
            )}

            {/* Text message content / Inline Edit */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="my-1 space-y-1.5">
                <input
                  type="text"
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  className="w-full bg-[#111b21] text-[#e9edef] px-2.5 py-1.5 rounded-lg text-xs border border-[#00a884] focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-0.5 hover:text-rose-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-[#00a884] text-[#111b21] font-semibold rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              message.content && (
                <div className="whitespace-pre-wrap break-words">
                  {formatMarkdown(message.content)}
                  {message.is_edited === 1 && (
                    <button
                      type="button"
                      onClick={() => setEditHistoryModalMsg(message)}
                      className="inline-flex items-center gap-0.5 text-[10px] text-[#00a884]/80 hover:text-[#00a884] hover:underline ml-1.5 select-none transition cursor-pointer"
                      title="Click to view previous versions"
                    >
                      <History className="w-2.5 h-2.5" />
                      <span>(edited)</span>
                    </button>
                  )}
                </div>
              )
            )}
          </>
        )}

        {/* Bottom Time & Status + Disappearing timer */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-[#8696a0] float-right ml-2">
          {expiresIn && (
            <span className="flex items-center gap-0.5 text-amber-400/80 font-medium">
              <Clock className="w-2.5 h-2.5" />
              {expiresIn}
            </span>
          )}
          <span>{formattedTime}</span>
          {isMe && !isDeletedEveryone && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
              ) : (
                <Check className="w-3.5 h-3.5 text-[#8696a0]" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Emoji Reactions Badges */}
      {Object.keys(reactionCounts).length > 0 && (
        <div
          className={`flex flex-wrap gap-1 mt-1 z-10 ${
            isMe ? 'justify-end mr-1' : 'justify-start ml-1'
          }`}
        >
          {Object.entries(reactionCounts).map(([emoji, data]) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(message.id, emoji)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition border ${
                data.hasReacted
                  ? 'bg-[#00a884]/20 border-[#00a884] text-[#00a884]'
                  : 'bg-[#202c33] border-[#2a3942] text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <span>{emoji}</span>
              {data.count > 1 && <span className="text-[10px] font-medium">{data.count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={message}
          isMe={isMe}
          onClose={() => setContextMenu(null)}
          onReply={() => setReplyingTo(message)}
          onCopy={handleCopyText}
          onCopyLink={handleCopyLink}
          onEdit={() => setIsEditing(true)}
          onTogglePin={() => togglePin(message.id)}
          onToggleStar={() => toggleStar(message.id)}
          onDeleteForMe={() => deleteMessageMode(message.id, 'for_me')}
          onDeleteForEveryone={() => deleteMessageMode(message.id, 'for_everyone')}
          onReact={(emoji) => toggleReaction(message.id, emoji)}
          onForward={() => setShowForwardModal(true)}
          onViewEditHistory={() => setEditHistoryModalMsg(message)}
          onSelect={() => toggleMessageSelection(message.id)}
        />
      )}

      {/* Forward Modal */}
      {showForwardModal && (
        <ForwardModal
          message={message}
          contacts={contacts}
          onClose={() => setShowForwardModal(false)}
          onForward={handleForwardMessage}
        />
      )}
    </div>
  );
}
