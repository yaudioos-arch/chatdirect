import React, { useEffect, useState, useRef } from 'react';
import { Heart, X, Eye, Trash2, Pause, Play, Send, Search, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiUrl } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function StoryViewerModal({ story, onClose }) {
  const { currentUser } = useAuth();
  const { socket, contacts } = useSocket();
  const [liked, setLiked] = useState(false);
  const [counts, setCounts] = useState({ viewers: 0, likes: 0 });
  const [details, setDetails] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(5000);
  const [remaining, setRemaining] = useState(5000);
  const [shareMessage, setShareMessage] = useState('');
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const replyInputRef = useRef(null);
  const isOwner = story.user_id === currentUser.id;

  useEffect(() => {
    setIsPaused(false);
    setDuration(5000);
    setRemaining(5000);
  }, [story.id]);

  useEffect(() => {
    if (isPaused) return undefined;
    const startedAt = Date.now();
    const initialRemaining = remaining;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemaining(Math.max(0, initialRemaining - elapsed));
    }, 50);
    const closeTimer = window.setTimeout(onClose, initialRemaining);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(closeTimer);
    };
  }, [story.id, isPaused, duration]);

  useEffect(() => {
    if (story.user_id !== currentUser.id) {
      fetch(apiUrl(`/api/stories/${story.id}/view`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
    }
    fetch(apiUrl(`/api/stories/${story.id}/details?ownerId=${encodeURIComponent(story.user_id)}`))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        setDetails(data);
        setCounts({ viewers: data.viewers.length, likes: data.likes.length });
        setLiked(data.likes.some((user) => user.id === currentUser.id));
      });
  }, [story.id, currentUser.id]);

  const toggleLike = async () => {
    const res = await fetch(apiUrl(`/api/stories/${story.id}/like`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    const data = await res.json();
    if (res.ok) {
      setLiked(data.liked);
      setCounts((prev) => ({ ...prev, likes: prev.likes + (data.liked ? 1 : -1) }));
    }
  };

  const handleShare = () => {
    setShowSharePicker(true);
    setIsPaused(true);
  };

  const sendStoryToFriend = () => {
    if (!selectedContact || !socket?.connected) {
      setShareMessage('Unable to send story right now');
      return;
    }
    const shareUrl = story.media_url
      ? new URL(story.media_url, window.location.origin).href
      : window.location.href;
    socket.emit('send_direct_message', {
      senderId: currentUser.id,
      receiverId: selectedContact.id,
      content: `${story.content || 'View this story'}\n${shareUrl}`,
      type: 'text',
      metadata: { kind: 'story', storyId: story.id, storyUrl: shareUrl },
      clientTempId: `story-share-${Date.now()}`
    }, (response) => {
      if (response?.error) {
        setShareMessage(response.error);
        return;
      }
      setShowSharePicker(false);
      setSelectedContact(null);
      setShareMessage(`Story sent to ${selectedContact.display_name}`);
      setIsPaused(false);
      window.setTimeout(() => setShareMessage(''), 2200);
    });
  };

  const sendStoryReply = () => {
    const content = replyText.trim();
    if (!content || isOwner || !socket?.connected) return;
    socket.emit('send_direct_message', {
      senderId: currentUser.id,
      receiverId: story.user_id,
      content,
      type: 'text',
      metadata: { kind: 'story_reply', storyId: story.id },
      clientTempId: `story-reply-${Date.now()}`
    }, (response) => {
      if (response?.error) {
        setReplyMessage(response.error);
        return;
      }
      setReplyText('');
      setReplyMessage('Reply sent');
      window.setTimeout(() => setReplyMessage(''), 2200);
    });
  };

  const filteredContacts = contacts.filter((contact) =>
    `${contact.display_name} ${contact.username}`.toLowerCase().includes(shareSearch.toLowerCase())
  );

  const storyAge = (() => {
    try {
      return formatDistanceToNow(new Date(story.created_at), { addSuffix: false });
    } catch {
      return 'now';
    }
  })();

  const handleDelete = async () => {
    if (!window.confirm('Delete this story permanently?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(apiUrl(`/api/stories/${story.id}`), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete story');
      }
      window.dispatchEvent(new CustomEvent('story-deleted', { detail: { storyId: story.id } }));
      onClose();
    } catch (err) {
      window.alert(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="story-viewer-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="story-viewer-shell relative overflow-hidden rounded-xl bg-black shadow-2xl">
        <div className="story-progress-row">
          <span
            className="story-progress-fill"
            style={{
              animationDuration: `${duration}ms`,
              animationPlayState: isPaused ? 'paused' : 'running',
              width: `${Math.max(0, Math.min(100, ((duration - remaining) / duration) * 100))}%`
            }}
          />
        </div>
        <div className="story-viewer-header absolute left-4 right-4 top-5 z-10 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
          <img
            src={story.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${story.username}`}
            alt=""
            className="h-8 w-8 rounded-full border border-white/70 object-cover"
          />
          <div className="flex items-center gap-1.5 text-xs">
            <strong>{story.display_name || 'Your story'}</strong>
            <span className="text-white/65">{storyAge}</span>
          </div>
          </div>
          <div className="flex items-center gap-1">
          {story.media_type?.startsWith('video/') && (
            <button
              onClick={() => setIsPaused((value) => !value)}
              className="rounded-full p-2 text-white hover:bg-white/15"
              aria-label={isPaused ? 'Play story' : 'Pause story'}
            >
              {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
            </button>
          )}
          <button onClick={onClose} className="rounded-full p-2 text-white hover:bg-white/15" aria-label="Close story">
            <X className="h-5 w-5" />
          </button>
          </div>
        </div>
        <div className="story-viewer-stage flex min-h-[560px] items-center justify-center">
          {story.media_url ? story.media_type?.startsWith('video/') ? (
          <video
            src={story.media_url}
            autoPlay
            onLoadedMetadata={(event) => {
              const videoDuration = Math.max(1000, event.currentTarget.duration * 1000);
              setDuration(videoDuration);
              setRemaining(videoDuration);
            }}
            onEnded={onClose}
            ref={(node) => {
              if (node) {
                if (isPaused) node.pause();
                else node.play().catch(() => {});
              }
            }}
            className="h-full w-full object-contain"
          />
          ) : (
          <img src={story.media_url} alt="" className="h-full w-full object-contain" />
          ) : <p className="whitespace-pre-wrap text-center text-2xl font-semibold text-white">{story.content}</p>}
        </div>
        {story.media_url && story.content && <p className="absolute bottom-20 left-5 right-5 text-center text-sm text-white drop-shadow-lg">{story.content}</p>}
        <div className="story-viewer-footer absolute bottom-4 left-4 right-4 z-10 flex items-center gap-3">
          {!isOwner && (
          <form
            className="story-reply-box flex flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              sendStoryReply();
            }}
          >
            <input
              ref={replyInputRef}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder={`Reply to ${story.display_name || 'this story'}...`}
              maxLength={500}
              className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/75"
              aria-label="Reply to story"
            />
            {replyText.trim() && (
              <button type="submit" className="text-white" aria-label="Send story reply">
                <Send className="h-4 w-4" />
              </button>
            )}
          </form>
          )}
          <div className="flex items-center gap-2 text-white">
          {isOwner ? (
            <>
              <span className="flex items-center gap-1 text-xs text-white/70"><Eye className="h-4 w-4" /> {counts.viewers}</span>
              <span className="text-xs text-white/80">♥ {counts.likes}</span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full p-2 text-rose-300 hover:bg-white/10 disabled:opacity-50"
                aria-label="Delete story"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button onClick={toggleLike} className={`rounded-full p-2 ${liked ? 'text-rose-400' : 'text-white'}`} aria-label={liked ? 'Unlike story' : 'Like story'}>
              <Heart className={`h-6 w-6 ${liked ? 'fill-current' : ''}`} />
            </button>
          )}
          <button onClick={handleShare} className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Share story">
            <Send className="h-5 w-5" />
          </button>
          </div>
        </div>
        {(shareMessage || replyMessage) && <div className="story-share-toast absolute bottom-16 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs text-white">{shareMessage || replyMessage}</div>}
        {showSharePicker && (
          <div className="story-share-picker absolute inset-x-3 bottom-16 z-40 rounded-2xl border border-white/15 bg-[#111b21]/95 p-3 shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between">
              <strong className="text-sm text-white">Send story to...</strong>
              <button onClick={() => { setShowSharePicker(false); setIsPaused(false); }} className="rounded-full p-1 text-white/70 hover:bg-white/10" aria-label="Close share picker"><X className="h-4 w-4" /></button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/45" />
              <input value={shareSearch} onChange={(event) => setShareSearch(event.target.value)} placeholder="Search friends" className="w-full rounded-lg border border-white/10 bg-white/10 py-2 pl-8 pr-2 text-xs text-white outline-none placeholder:text-white/45" />
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {filteredContacts.map((contact) => (
                <button key={contact.id} onClick={() => setSelectedContact(contact)} className={`flex w-full items-center justify-between rounded-lg p-2 text-left ${selectedContact?.id === contact.id ? 'bg-[#00a884]/25' : 'hover:bg-white/10'}`}>
                  <span className="flex min-w-0 items-center gap-2">
                    <img src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`} alt="" className="h-7 w-7 rounded-full" />
                    <span className="truncate text-xs text-white">{contact.display_name}</span>
                  </span>
                  {selectedContact?.id === contact.id && <Check className="h-4 w-4 text-[#00a884]" />}
                </button>
              ))}
            </div>
            <button disabled={!selectedContact} onClick={sendStoryToFriend} className="mt-2 w-full rounded-lg bg-[#00a884] py-2 text-xs font-semibold text-[#061b17] disabled:cursor-not-allowed disabled:opacity-40">Send</button>
          </div>
        )}
        {isOwner && details && (
          <div className="story-owner-details absolute bottom-16 left-4 right-4 z-20 bg-transparent px-4 py-3 text-xs text-white/70">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Viewed by</span>
              <span>{details.viewers.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {details.viewers.length === 0 ? (
                <span className="text-white/50">No viewers yet</span>
              ) : details.viewers.map((user) => {
                const likedStory = details.likes.some((likedUser) => likedUser.id === user.id);
                return (
                  <div key={user.id} className="story-viewer-avatar" title={`${user.display_name}${likedStory ? ' liked your story' : ''}`}>
                    <img src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`} alt={user.display_name} />
                    {likedStory && <span className="story-like-badge" aria-label="Liked story">♥</span>}
                  </div>
                );
              })}
            </div>
            {details.likes.length > 0 && (
              <p className="mt-2 text-rose-300">♥ {details.likes.length} {details.likes.length === 1 ? 'like' : 'likes'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
