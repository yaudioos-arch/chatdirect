import React, { useEffect, useRef } from 'react';
import {
  Copy,
  Reply,
  Pin,
  Star,
  Trash2,
  Edit2,
  Share2,
  Link,
  Smile,
  Check,
  History,
  CheckSquare
} from 'lucide-react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '👏', '🙏', '💯'];

export default function ContextMenu({
  x,
  y,
  message,
  isMe,
  onClose,
  onReply,
  onCopy,
  onCopyLink,
  onEdit,
  onTogglePin,
  onToggleStar,
  onDeleteForMe,
  onDeleteForEveryone,
  onReact,
  onForward,
  onViewEditHistory,
  onSelect
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates if menu overflows window
  const menuWidth = 220;
  const menuHeight = 320;
  const posX = Math.min(x, window.innerWidth - menuWidth - 16);
  const posY = Math.min(y, window.innerHeight - menuHeight - 16);

  return (
    <div
      ref={menuRef}
      style={{ left: posX, top: posY }}
      className="fixed z-50 w-56 bg-[#202c33] border border-[#2a3942] rounded-2xl shadow-2xl py-1.5 text-xs text-[#e9edef] select-none animate-fadeIn backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick emoji reactions row */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a3942]/60 overflow-x-auto gap-1">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReact(emoji);
              onClose();
            }}
            className="hover:scale-125 transition text-sm p-0.5"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="py-1">
        {/* Reply */}
        <button
          onClick={() => {
            onReply();
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
        >
          <Reply className="w-3.5 h-3.5 text-[#00a884]" />
          <span>Reply / Quote</span>
        </button>

        {/* Copy text */}
        {message.content && (
          <button
            onClick={() => {
              onCopy();
              onClose();
            }}
            className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
          >
            <Copy className="w-3.5 h-3.5 text-[#8696a0]" />
            <span>Copy Message Text</span>
          </button>
        )}

        {/* Copy direct message link */}
        <button
          onClick={() => {
            onCopyLink();
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
        >
          <Link className="w-3.5 h-3.5 text-[#8696a0]" />
          <span>Copy Message Link</span>
        </button>

        {/* Edit message (if own message and text) */}
        {isMe && message.type === 'text' && !message.is_deleted_everyone && (
          <button
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
          >
            <Edit2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Edit Message</span>
          </button>
        )}

        {/* Edit History (if message is edited) */}
        {message.is_edited === 1 && onViewEditHistory && (
          <button
            onClick={() => {
              onViewEditHistory();
              onClose();
            }}
            className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
          >
            <History className="w-3.5 h-3.5 text-[#00a884]" />
            <span>View Edit History</span>
          </button>
        )}

        {/* Pin / Unpin */}
        <button
          onClick={() => {
            onTogglePin();
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
        >
          <Pin className={`w-3.5 h-3.5 ${message.is_pinned ? 'text-amber-400 fill-current' : 'text-[#8696a0]'}`} />
          <span>{message.is_pinned ? 'Unpin from Chat' : 'Pin Message'}</span>
        </button>

        {/* Star / Unstar */}
        <button
          onClick={() => {
            onToggleStar();
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
        >
          <Star className={`w-3.5 h-3.5 ${message.is_starred ? 'text-amber-400 fill-current' : 'text-[#8696a0]'}`} />
          <span>{message.is_starred ? 'Unstar Message' : 'Star / Bookmark'}</span>
        </button>

        {/* Forward */}
        <button
          onClick={() => {
            onForward();
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
        >
          <Share2 className="w-3.5 h-3.5 text-[#8696a0]" />
          <span>Forward Message</span>
        </button>

        {/* Select */}
        {onSelect && (
          <button
            onClick={() => {
              onSelect();
              onClose();
            }}
            className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] transition text-left"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#00a884]" />
            <span>Select Messages</span>
          </button>
        )}
      </div>

      {/* Delete actions separator */}
      <div className="border-t border-[#2a3942]/60 pt-1">
        <button
          onClick={() => {
            onDeleteForMe();
            onClose();
          }}
          className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-rose-500/15 text-rose-300 transition text-left"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete for Me</span>
        </button>

        {isMe && !message.is_deleted_everyone && (
          <button
            onClick={() => {
              onDeleteForEveryone();
              onClose();
            }}
            className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-rose-500/20 text-rose-400 font-medium transition text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete for Everyone</span>
          </button>
        )}
      </div>
    </div>
  );
}