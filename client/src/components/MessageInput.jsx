import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  X,
  Image as ImageIcon,
  FileText,
  CornerDownRight,
  Sparkles,
  UserCheck,
  Clock,
  RotateCcw
} from 'lucide-react';
import GifPickerModal from './GifPickerModal';
import ContactShareModal from './ContactShareModal';
import ScheduleModal from './ScheduleModal';
import { apiUrl } from '../lib/api';

const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
  '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩',
  '🥳','😏','😒','😞','😔','😟','😕','🙁','😣','😖',
  '😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯',
  '😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔',
  '👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👏','🙌',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','🔥',
  '✨','🎉','🎊','🎈','🎁','🏆','🚀','⭐','🌟','💡'
];

export default function MessageInput() {
  const {
    activeChat,
    sendMessage,
    sendTyping,
    sendRecording,
    replyingTo,
    setReplyingTo,
    undoMessageCandidate,
    undoSentMessage,
    contacts,
    unblockUser
  } = useSocket();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);

  // Restore draft per active contact
  useEffect(() => {
    if (!activeChat) return;
    const draftKey = `draft_${activeChat.id}`;
    const savedDraft = localStorage.getItem(draftKey) || '';
    setText(savedDraft);
  }, [activeChat?.id]);

  // Save draft when text changes
  useEffect(() => {
    if (!activeChat) return;
    const draftKey = `draft_${activeChat.id}`;
    if (text) {
      localStorage.setItem(draftKey, text);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [text, activeChat?.id]);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Stop broadcasting typing when changing conversations or unmounting.
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      sendTyping(false);
    };
  }, [activeChat?.id]);

  const handleInputChange = (e) => {
    setText(e.target.value);
    sendTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage({ content: trimmed, type: 'text' });
    setText('');
    sendTyping(false);
    if (activeChat) localStorage.removeItem(`draft_${activeChat.id}`);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  const addEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleGifSelect = (gifUrl) => {
    sendMessage({
      content: '',
      type: 'gif',
      fileUrl: gifUrl,
      fileName: 'sticker.gif',
      fileSize: 0
    });
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target?.files ? e.target.files[0] : e;
    if (!file) return;
    setIsUploading(true);
    setShowAttachMenu(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.fileUrl) {
        const isVideo = file.type?.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(data.fileName || '');
        const isImage = file.type?.startsWith('image/');
        const detectedType = type || (isVideo ? 'video' : isImage ? 'image' : 'file');

        sendMessage({
          content: '',
          type: detectedType,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          metadata: (detectedType === 'image' || detectedType === 'video') && viewOnce ? { view_once: true } : null
        });
        if (viewOnce) setViewOnce(false);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Drag & drop file handler
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioFile);
        try {
          const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: formData });
          const data = await res.json();
          if (data.fileUrl) {
            sendMessage({
              content: '',
              type: 'audio',
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              fileSize: data.fileSize,
              audioDuration: recordingTime
            });
          }
        } catch (err) {
          console.error('Audio upload failed:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      sendRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    sendRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSend) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
      }
      mediaRecorderRef.current.stop();
    }
  };

  const formatRecTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`bg-[#202c33] border-t border-[#222d34] p-3 select-none relative z-20 transition ${
        isDragOver ? 'border-[#00a884] bg-[#1a2e2b]' : ''
      }`}
    >
      {/* Undo Sent Message Banner (WhatsApp / Telegram style) */}
      {undoMessageCandidate && (
        <div className="absolute -top-12 left-4 right-4 bg-[#182229] border border-[#00a884] px-4 py-2 rounded-xl flex items-center justify-between shadow-2xl animate-fadeIn z-30">
          <span className="text-xs text-[#e9edef] truncate">
            Message sent. Need to cancel?
          </span>
          <button
            onClick={undoSentMessage}
            className="flex items-center gap-1 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] px-2.5 py-1 rounded-lg text-xs font-bold transition shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <GifPickerModal
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleGifSelect}
      />

      {showContactModal && (
        <ContactShareModal
          contacts={contacts}
          onClose={() => setShowContactModal(false)}
          onSubmit={(contactData) => {
            sendMessage({
              content: `👤 Contact: ${contactData.name}`,
              type: 'contact',
              metadata: contactData
            });
          }}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSchedule={(targetTime) => {
            const trimmed = text.trim();
            if (!trimmed) {
              alert('Please type a message before scheduling.');
              return;
            }
            sendMessage({
              content: trimmed,
              type: 'text',
              scheduledAt: targetTime
            });
            setText('');
          }}
        />
      )}

      {/* Quoted reply banner */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-[#182229] border-l-4 border-[#00a884] px-3.5 py-2 rounded-lg mb-2 animate-fadeIn">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5 text-xs text-[#00a884] font-semibold">
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>Replying to {replyingTo.reply_sender_name || (replyingTo.type === 'image' ? 'photo' : 'message')}</span>
            </div>
            <p className="text-xs text-[#8696a0] truncate mt-0.5">
              {replyingTo.content || (replyingTo.type === 'image' ? 'Photo' : replyingTo.file_name || 'Attachment')}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-[#202c33] text-[#8696a0] hover:text-[#e9edef] rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 w-72 sm:w-80 bg-[#182229] border border-[#2a3942] rounded-2xl p-3 shadow-2xl z-40 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a3942] text-xs font-semibold text-[#8696a0]">
            <span>Emoji Picker</span>
            <button onClick={() => setShowEmojiPicker(false)} className="text-[#8696a0] hover:text-[#e9edef]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-56 overflow-y-auto pr-1">
            {EMOJI_LIST.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="hover:bg-[#202c33] rounded-lg p-1.5 text-lg hover:scale-125 transition flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Menu (Extended with Poll, Location, Contact, Scheduled) */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-12 bg-[#182229] border border-[#2a3942] rounded-2xl p-2 shadow-2xl z-40 animate-fadeIn flex flex-col gap-1 w-52">
          <button
            onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#e9edef] hover:bg-[#202c33] rounded-xl transition text-left"
          >
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span>Photos & Videos</span>
          </button>
          <button
            onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#e9edef] hover:bg-[#202c33] rounded-xl transition text-left"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Document / File</span>
          </button>
          <button
            onClick={() => { setShowContactModal(true); setShowAttachMenu(false); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#e9edef] hover:bg-[#202c33] rounded-xl transition text-left"
          >
            <UserCheck className="w-4 h-4 text-teal-400" />
            <span>Share Contact</span>
          </button>
          <button
            onClick={() => { setShowScheduleModal(true); setShowAttachMenu(false); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#e9edef] hover:bg-[#202c33] rounded-xl transition text-left"
          >
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Schedule Message</span>
          </button>
          <button
            onClick={() => { setShowGifPicker(true); setShowAttachMenu(false); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#e9edef] hover:bg-[#202c33] rounded-xl transition text-left"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>GIFs & Stickers</span>
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFileUpload(e)} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'file')} />

      {/* Blocked by Me / Blocked by Them Banner */}
      {activeChat?.isBlockedByMe ? (
        <div className="flex items-center justify-between bg-[#182229] border border-rose-500/30 px-4 py-3 rounded-xl">
          <div className="text-xs text-rose-300">
            <p className="font-semibold">You blocked this contact.</p>
            <p className="text-[11px] text-[#8696a0]">You cannot send or receive messages.</p>
          </div>
          <button
            type="button"
            onClick={() => unblockUser(activeChat.id)}
            className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition"
          >
            Unblock Contact
          </button>
        </div>
      ) : activeChat?.isBlockedByThem ? (
        <div className="bg-[#182229] border border-[#222d34] px-4 py-3 rounded-xl text-center text-xs text-[#8696a0]">
          You cannot send messages to this contact.
        </div>
      ) : (
        /* Main Input Bar */
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between bg-[#111b21] px-4 py-2 rounded-xl border border-rose-500/40 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-semibold text-rose-400">Recording audio...</span>
                <span className="text-xs text-[#8696a0] font-mono">{formatRecTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => stopRecording(false)} className="p-1.5 hover:bg-[#202c33] text-[#8696a0] hover:text-rose-400 rounded-lg text-xs transition">
                  Cancel
                </button>
                <button type="button" onClick={() => stopRecording(true)} className="bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition">
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Emoji button */}
              <button
                type="button"
                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }}
                className={`p-2.5 rounded-xl transition ${showEmojiPicker ? 'text-[#00a884] bg-[#2a3942]' : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'}`}
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Attach button */}
              <button
                type="button"
                onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }}
                disabled={isUploading}
                className={`p-2.5 rounded-xl transition ${showAttachMenu ? 'text-[#00a884] bg-[#2a3942]' : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'} ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                title="Attach File, Photo, Poll, Location or Schedule"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </button>

              {/* View Once Toggle Button */}
              <button
                type="button"
                onClick={() => setViewOnce(!viewOnce)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition flex-shrink-0 ${
                  viewOnce
                    ? 'border-[#00a884] bg-[#00a884] text-[#111b21] ring-2 ring-[#00a884]/40 scale-105'
                    : 'border-[#8696a0]/40 text-[#8696a0] hover:text-[#e9edef] hover:border-[#8696a0]'
                }`}
                title={viewOnce ? 'View once is ON (media can be opened once)' : 'Turn ON View Once for photo/video'}
              >
                1
              </button>

              {/* Text Input with Character Counter */}
              <div className="flex-1 relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message (supports *bold*, _italic_, `code`)..."
                  className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] pl-4 pr-12 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
                {text.length > 0 && (
                  <span className="absolute right-3 text-[10px] text-[#8696a0] font-mono pointer-events-none">
                    {text.length}
                  </span>
                )}
              </div>

              {/* Send or Voice Note */}
              {text.trim() ? (
                <button
                  type="button"
                  onClick={handleSend}
                  className="w-10 h-10 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] rounded-xl flex items-center justify-center transition shadow-md shadow-[#00a884]/20 flex-shrink-0"
                  title="Send Message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2.5 text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] rounded-xl transition flex-shrink-0"
                  title="Record Voice Note"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
