import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageItem from './MessageItem';
import ChatLockScreen from './ChatLockScreen';
import { format, isSameDay } from 'date-fns';
import {
  Lock,
  MessageSquare,
  ChevronDown,
  WifiOff,
  RefreshCw,
  Share2,
  Trash2,
  Bookmark,
  X,
  Download,
  CheckSquare,
  Star
} from 'lucide-react';
import ForwardModal from './ForwardModal';

export const formatDateDivider = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  if (isSameDay(date, now)) return 'TODAY';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'YESTERDAY';
  return format(date, 'MMMM d, yyyy').toUpperCase();
};

export default function MessageList() {
  const { currentUser } = useAuth();
  const {
    messages,
    activeChat,
    typingMap,
    isOnlineNetwork,
    socket,
    chatSettings,
    contacts,
    selectedMessageIds,
    clearMessageSelection,
    selectAllMessages,
    forwardMessagesTo,
    bulkDeleteMessages,
    bulkStarMessages,
    exportSelectedMessages,
    unlockedChats
  } = useSocket();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showForward, setShowForward] = useState(false);

  const isOtherTyping = activeChat ? typingMap[activeChat.id] : false;

  const scrollToBottom = (smooth = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 250;
    setShowScrollBottom(isUp);
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeChat?.id]);

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom(true);
    }
  }, [messages.length, isOtherTyping]);

  if (!activeChat) return null;

  // Screen-lock check: if conversation is locked and not unlocked in this session
  const isChatLocked = Boolean(activeChat.isLocked || chatSettings?.is_locked === 1) && !unlockedChats.has(activeChat.id);
  if (isChatLocked) {
    return <ChatLockScreen contact={activeChat} />;
  }

  const isDisconnected = !isOnlineNetwork || (socket && !socket.connected);

  // Background wallpaper styling
  const effectiveWallpaper = chatSettings?.wallpaper || activeChat?.wallpaper || '';
  const wallpaperStyle = effectiveWallpaper
    ? effectiveWallpaper.startsWith('http') || effectiveWallpaper.startsWith('/uploads')
      ? { backgroundImage: `url(${effectiveWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : effectiveWallpaper.startsWith('linear-gradient')
      ? { background: effectiveWallpaper }
      : { backgroundColor: effectiveWallpaper }
    : {};

  const allSelectedAreMine = selectedMessageIds.length > 0 && selectedMessageIds.every(
    (id) => messages.find((m) => m.id === id)?.sender_id === currentUser?.id
  );

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Enhanced Multi-Message Bulk Action Bar */}
      {selectedMessageIds.length > 0 && (
        <div className="h-14 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between text-xs z-30 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-[#e9edef] font-semibold text-xs bg-[#111b21] px-2.5 py-1 rounded-full border border-[#2a3942]">
              {selectedMessageIds.length} selected
            </span>
            <button
              type="button"
              onClick={selectAllMessages}
              className="text-[#00a884] hover:underline flex items-center gap-1 font-medium transition"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select All</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bulk Forward */}
            <button
              onClick={() => setShowForward(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111b21] hover:bg-[#2a3942] text-[#00a884] border border-[#2a3942] rounded-xl font-medium transition"
              title="Forward selected messages"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Forward</span>
            </button>

            {/* Bulk Star / Save */}
            <button
              onClick={bulkStarMessages}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111b21] hover:bg-[#2a3942] text-amber-400 border border-[#2a3942] rounded-xl font-medium transition"
              title="Star / Save selected"
            >
              <Star className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Star</span>
            </button>

            {/* Export / Download as File */}
            <button
              onClick={exportSelectedMessages}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111b21] hover:bg-[#2a3942] text-sky-400 border border-[#2a3942] rounded-xl font-medium transition"
              title="Download selected messages as text file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save File</span>
            </button>

            {/* Bulk Delete */}
            <button
              onClick={() => bulkDeleteMessages('for_me')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl font-medium transition"
              title="Delete selected for me"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            {allSelectedAreMine && (
              <button
                onClick={() => bulkDeleteMessages('for_everyone')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 rounded-xl font-bold transition text-[11px]"
                title="Delete selected for everyone"
              >
                <span>For Everyone</span>
              </button>
            )}

            {/* Cancel selection */}
            <button
              onClick={clearMessageSelection}
              className="p-1.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-xl transition ml-1"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Offline / Reconnecting Banner */}
      {isDisconnected && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-300 text-xs px-4 py-1.5 flex items-center justify-center gap-2 select-none animate-fadeIn z-10">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Connection lost. Waiting to reconnect... Messages will be queued offline.</span>
          <RefreshCw className="w-3 h-3 animate-spin ml-1" />
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 chat-bg-pattern flex flex-col justify-start select-text"
        style={wallpaperStyle}
      >
        {/* End-to-end encryption privacy notice banner */}
        <div className="flex justify-center my-3 select-none">
          <div className="bg-[#182229]/90 border border-[#222d34] text-[#ffd279] text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm text-center max-w-md">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Messages are 1-on-1 private between you and {activeChat.display_name}.</span>
          </div>
        </div>

        {/* Empty conversation placeholder */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-12 text-[#8696a0] select-none">
            <div className="w-16 h-16 rounded-full bg-[#182229] border border-[#222d34] flex items-center justify-center mb-3 text-[#00a884]">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-[#e9edef]">No messages yet</h3>
            <p className="text-xs max-w-xs mt-1 text-[#8696a0]">
              Say hello to {activeChat.display_name} to start your direct 1-on-1 chat!
            </p>
          </div>
        )}

        {/* Messages stream with date dividers */}
        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const showDateDivider = !prevMsg || !isSameDay(new Date(msg.created_at), new Date(prevMsg.created_at));

          return (
            <React.Fragment key={msg.id || index}>
              {showDateDivider && (
                <div className="flex justify-center my-3 select-none">
                  <span className="bg-[#182229] text-[#8696a0] text-[11px] font-semibold px-3 py-1 rounded-lg border border-[#222d34]/60 shadow-sm">
                    {formatDateDivider(msg.created_at)}
                  </span>
                </div>
              )}
              <MessageItem message={msg} />
            </React.Fragment>
          );
        })}

        {/* Real-time Typing Bubble */}
        {isOtherTyping && (
          <div className="flex items-center gap-2 mb-2 px-4 select-none animate-fadeIn">
            <div className="bg-[#202c33] text-[#e9edef] px-3.5 py-2 rounded-2xl rounded-tl-none chat-bubble-tail-in flex items-center gap-1.5 text-xs text-[#8696a0]">
              <span className="text-xs text-[#00a884] font-medium">{activeChat.display_name} is typing</span>
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {showForward && <ForwardModal message={{ content: selectedMessageIds.length + ' selected messages', type: 'text' }} contacts={contacts} onClose={() => setShowForward(false)} onForward={(_, target) => { forwardMessagesTo(messages.filter((m) => selectedMessageIds.includes(m.id)), target); clearMessageSelection(); }} />}
      {/* Floating Jump to Latest Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-6 w-10 h-10 bg-[#202c33] hover:bg-[#2a3942] border border-[#222d34] text-[#8696a0] hover:text-[#00a884] rounded-full flex items-center justify-center shadow-xl transition animate-fadeIn z-20"
          title="Jump to latest message"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

