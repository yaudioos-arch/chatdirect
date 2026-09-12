import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiUrl } from '../lib/api';
import {
  Search,
  Volume2,
  VolumeX,
  Settings,
  UserPlus,
  LogOut,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  MessageSquare,
  Archive,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  FileText,
  MapPin,
  Calendar,
  Lock,
  Users,
  Plus
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MM/dd/yy');
};

export default function Sidebar({ onOpenProfile, onOpenStory, onOpenStoryViewer }) {
  const { currentUser, logout } = useAuth();
  const {
    contacts,
    activeChat,
    selectChat,
    soundEnabled,
    setSoundEnabled,
    setUserStatus,
    callLogs,
    clearCallLogs,
    startCall,
    friendRequests,
    setShowUserSearch,
    setShowFriendRequests
  } = useSocket();

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'calls'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'online' | 'unread'
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [stories, setStories] = useState([]);

  const fetchStories = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(apiUrl(`/api/stories/${currentUser.id}`));
      const data = await res.json();
      if (res.ok) setStories(data.stories || []);
    } catch (err) {
      console.error('Fetch stories failed:', err);
    }
  };

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 60000);
    const handleStoryDeleted = (event) => setStories((prev) => prev.filter((story) => story.id !== event.detail?.storyId));
    window.addEventListener('story-deleted', handleStoryDeleted);
    return () => {
      clearInterval(interval);
      window.removeEventListener('story-deleted', handleStoryDeleted);
    };
  }, [currentUser?.id]);

  // Filter contacts by search query & filter mode
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.lastMessage?.content || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'online') {
      return contact.isOnline && contact.status !== 'offline';
    }
    if (filterMode === 'unread') {
      return (contact.unreadCount || 0) > 0;
    }
    return true;
  });

  const storiesByUser = stories.reduce((groups, story) => {
    if (!groups[story.user_id]) groups[story.user_id] = [];
    groups[story.user_id].push(story);
    return groups;
  }, {});

  // Filter call logs
  const filteredCallLogs = callLogs.filter((log) => {
    const partnerName = log.partner_name || log.caller_name || log.receiver_name || '';
    return partnerName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusColor = (status, isOnline) => {
    if (!isOnline || status === 'offline') return 'bg-neutral-500';
    if (status === 'away') return 'bg-amber-400';
    if (status === 'dnd') return 'bg-rose-500';
    return 'bg-emerald-500';
  };

  const handleStatusChange = (status) => {
    setUserStatus(status);
    setShowStatusMenu(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleCallPartner = (e, targetContact, isVideo) => {
    e.stopPropagation();
    if (!targetContact) return;
    startCall(targetContact, isVideo);
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-[#111b21] border-r border-[#222d34] flex flex-col h-full select-none">
      {/* Top Profile Header */}
      <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between border-b border-[#222d34]/60">
        <div className="flex items-center gap-3">
          <div
            className={`relative cursor-pointer ${storiesByUser[currentUser?.id]?.length ? 'story-profile-ring' : ''}`}
            onClick={() => {
              if (storiesByUser[currentUser?.id]?.length) {
                onOpenStoryViewer(storiesByUser[currentUser.id][0]);
              } else {
                setShowStatusMenu(!showStatusMenu);
              }
            }}
          >
            <img
              src={currentUser?.avatar}
              alt={currentUser?.display_name}
              className="w-10 h-10 rounded-full bg-[#111b21] border-2 border-[#202c33] object-cover p-0.5"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#202c33] ${getStatusColor(
                currentUser?.status || 'online',
                true
              )}`}
            />

            {/* Status Selector Dropdown */}
            {showStatusMenu && (
              <div
                className="absolute top-12 left-0 w-44 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 text-[#8696a0] font-semibold border-b border-[#2a3942]/50 mb-1">
                  Set Your Status
                </div>
                <button
                  onClick={() => handleStatusChange('online')}
                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] text-left text-[#e9edef]"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Online</span>
                </button>
                <button
                  onClick={() => handleStatusChange('away')}
                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] text-left text-[#e9edef]"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Away</span>
                </button>
                <button
                  onClick={() => handleStatusChange('dnd')}
                  className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#111b21] text-left text-[#e9edef]"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Do Not Disturb</span>
                </button>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-sm text-[#e9edef] truncate">{currentUser?.display_name}</h2>
            <p className="text-[11px] text-[#8696a0] truncate">@{currentUser?.username}</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenStory}
            className="p-2 text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] rounded-lg transition"
            title="Add to your story"
            aria-label="Add to your story"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition ${
              soundEnabled ? 'text-[#00a884] hover:bg-[#2a3942]' : 'text-[#8696a0] hover:bg-[#2a3942]'
            }`}
            title={soundEnabled ? 'Mute Notification Sounds' : 'Unmute Notification Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Add Friends */}
          <button
            onClick={() => setShowUserSearch(true)}
            className="p-2 text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] rounded-lg transition relative"
            title="Add Friends"
          >
            <UserPlus className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenProfile}
            className="p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] rounded-lg transition"
            title="Profile & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tab Switcher: Chats | Calls | Requests */}
      <div className="flex border-b border-[#222d34]/60 bg-[#111b21] px-2 pt-2">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'chats'
              ? 'border-[#00a884] text-[#00a884]'
              : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chats</span>
          {contacts.some((c) => (c.unreadCount || 0) > 0) && (
            <span className="w-2 h-2 rounded-full bg-[#00a884]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('calls')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'calls'
              ? 'border-[#00a884] text-[#00a884]'
              : 'border-transparent text-[#8696a0] hover:text-[#e9edef]'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Calls</span>
          {callLogs.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#202c33] text-[#8696a0]">
              {callLogs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowFriendRequests(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold border-b-2 transition border-transparent text-[#8696a0] hover:text-[#e9edef]`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Requests</span>
          {friendRequests.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-[#00a884] text-[#111b21] min-w-[18px] text-center">
              {friendRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filter Header */}
      <div className="p-3 bg-[#111b21] space-y-2 border-b border-[#222d34]/40">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'chats' ? 'Search contacts or messages...' : 'Search call logs...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#202c33] text-[#e9edef] pl-10 pr-4 py-2 rounded-lg text-xs placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
          />
        </div>

        {activeTab === 'calls' && callLogs.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (!window.confirm('Clear all call history?')) return;
                try {
                  await clearCallLogs();
                } catch (error) {
                  window.alert(error.message);
                }
              }}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-rose-400 transition hover:bg-[#202c33] hover:text-rose-300"
              title="Clear all call history"
            >
              Clear all
            </button>
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="flex gap-1.5 pt-0.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterMode === 'all'
                  ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40'
                  : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              All ({contacts.length})
            </button>
            <button
              onClick={() => setFilterMode('online')}
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                filterMode === 'online'
                  ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40'
                  : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Online ({contacts.filter((c) => c.isOnline && c.status !== 'offline').length})
            </button>
            <button
              onClick={() => setFilterMode('unread')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterMode === 'unread'
                  ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40'
                  : 'bg-[#202c33] text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Unread ({contacts.filter((c) => (c.unreadCount || 0) > 0).length})
            </button>
          </div>
        )}
      </div>

      {/* Main List Area: Chats or Call History */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/20">
        {activeTab === 'chats' ? (
          filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-[#8696a0]">
              <div className="w-14 h-14 rounded-full bg-[#202c33] flex items-center justify-center mx-auto mb-3 text-[#00a884]">
                <Users className="w-7 h-7" />
              </div>
              <p className="text-xs font-semibold text-[#e9edef] mb-1">
                {contacts.length === 0 ? 'No friends yet' : 'No contacts found'}
              </p>
              <p className="text-[11px] text-[#8696a0] mb-4">
                {contacts.length === 0
                  ? 'Add friends to start chatting. Search for users by username or display name.'
                  : 'No contacts match your search or filter.'}
              </p>
              {contacts.length === 0 && (
                <button
                  onClick={() => setShowUserSearch(true)}
                  className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-semibold text-xs px-4 py-2 rounded-xl transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Friends
                </button>
              )}
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = activeChat?.id === contact.id;
              const lastMsg = contact.lastMessage;
              const isMe = lastMsg?.sender_id === currentUser?.id;

              return (
                <div
                  key={contact.id}
                  onClick={() => selectChat(contact)}
                  className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#2a3942]'
                      : 'hover:bg-[#202c33]/70'
                  }`}
                >
                  {/* Avatar with status dot */}
                  <div
                    className={`relative flex-shrink-0 ${storiesByUser[contact.id]?.length ? 'story-profile-ring' : ''}`}
                    onClick={(event) => {
                      if (storiesByUser[contact.id]?.length) {
                        event.stopPropagation();
                        onOpenStoryViewer(storiesByUser[contact.id][0]);
                      }
                    }}
                    role={storiesByUser[contact.id]?.length ? 'button' : undefined}
                    tabIndex={storiesByUser[contact.id]?.length ? 0 : undefined}
                    title={storiesByUser[contact.id]?.length ? 'View story' : undefined}
                  >
                    <img
                      src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`}
                      alt={contact.display_name}
                      className="w-12 h-12 rounded-full bg-[#202c33] border-2 border-[#111b21] object-cover p-0.5"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111b21] ${getStatusColor(
                        contact.status,
                        contact.isOnline
                      )}`}
                    />
                  </div>

                  {/* Info & Last message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-semibold text-sm text-[#e9edef] truncate">{contact.display_name}</h3>
                        {contact.isLocked && <Lock className="w-3 h-3 text-[#00a884] flex-shrink-0" title="Screen Locked" />}
                      </div>
                      {lastMsg && (
                        <span className="text-[11px] text-[#8696a0] flex-shrink-0 ml-1">
                          {formatMessageTime(lastMsg.created_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#8696a0]">
                      <div className="flex items-center gap-1 truncate pr-2">
                        {isMe && (
                          <span>
                            {lastMsg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                            ) : lastMsg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                            )}
                          </span>
                        )}

                        {lastMsg ? (
                          lastMsg.type === 'image' ? (
                            <span className="flex items-center gap-1 text-[#e9edef] italic truncate">
                              <ImageIcon className="w-3.5 h-3.5 text-[#00a884]" /> Photo
                            </span>
                          ) : lastMsg.type === 'audio' ? (
                            <span className="flex items-center gap-1 text-[#e9edef] italic truncate">
                              <Mic className="w-3.5 h-3.5 text-[#00a884]" /> Voice message
                            </span>
                          ) : lastMsg.type === 'file' ? (
                            <span className="flex items-center gap-1 text-[#e9edef] italic truncate">
                              <FileText className="w-3.5 h-3.5 text-[#00a884]" /> {lastMsg.file_name || 'File'}
                            </span>
                          ) : lastMsg.type === 'location' ? (
                            <span className="flex items-center gap-1 text-[#e9edef] italic truncate">
                              <MapPin className="w-3.5 h-3.5 text-rose-400" /> Location
                            </span>
                          ) : (
                            <span className="truncate">{lastMsg.content}</span>
                          )
                        ) : (
                          <span className="text-[11px] text-[#8696a0]/70 italic truncate">
                            {contact.bio || 'Tap to start direct conversation'}
                          </span>
                        )}
                      </div>

                      {/* Unread badge */}
                      {contact.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-[#00a884] text-[#111b21] rounded-full text-[11px] font-bold flex items-center justify-center">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Call History Tab */
          filteredCallLogs.length === 0 ? (
            <div className="p-8 text-center text-[#8696a0]">
              <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center mx-auto mb-3 text-[#00a884]">
                <Phone className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-[#e9edef]">No call history</p>
              <p className="text-[11px] mt-1 text-[#8696a0]">
                Direct audio and video calls you make or receive will appear here.
              </p>
            </div>
          ) : (
            filteredCallLogs.map((log) => {
              const isOutgoing = log.caller_id === currentUser?.id;
              const partnerName = isOutgoing ? log.receiver_name : log.caller_name;
              const partnerAvatar = isOutgoing ? log.receiver_avatar : log.caller_avatar;
              const partnerId = isOutgoing ? log.receiver_id : log.caller_id;
              const isMissed = log.status === 'missed';
              const isDeclined = log.status === 'declined';
              const targetContact = contacts.find((c) => c.id === partnerId);

              return (
                <div
                  key={log.id}
                  onClick={() => {
                    if (targetContact) selectChat(targetContact);
                  }}
                  className="flex items-center justify-between px-3.5 py-3 hover:bg-[#202c33]/70 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={partnerAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${partnerName}`}
                      alt={partnerName}
                      className="w-11 h-11 rounded-full bg-[#202c33] border border-[#222d34] object-cover"
                    />
                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          isMissed ? 'text-rose-400' : 'text-[#e9edef]'
                        }`}
                      >
                        {partnerName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#8696a0] mt-0.5">
                        {isMissed ? (
                          <PhoneMissed className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        ) : isOutgoing ? (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <PhoneIncoming className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                        )}
                        <span>
                          {isMissed
                            ? 'Missed'
                            : isDeclined
                            ? 'Declined'
                            : formatDuration(log.duration)}
                        </span>
                        <span>•</span>
                        <span className="text-[11px]">{formatMessageTime(log.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Callback Actions */}
                  {targetContact && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => handleCallPartner(e, targetContact, false)}
                        className="p-2 hover:bg-[#2a3942] text-[#00a884] rounded-lg transition"
                        title="Start Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleCallPartner(e, targetContact, true)}
                        className="p-2 hover:bg-[#2a3942] text-[#00a884] rounded-lg transition"
                        title="Start Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-[#111b21] border-t border-[#222d34]/60 text-center flex items-center justify-between text-[11px] text-[#8696a0]">
        <span>1-on-1 Direct Chat</span>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-[#8696a0] hover:text-rose-400 transition"
        >
          <LogOut className="w-3 h-3" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
