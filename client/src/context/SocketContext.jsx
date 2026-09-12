import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { apiUrl, socketUrl } from '../lib/api';
import { playReceiveSound, playSendSound } from '../utils/sound';

const SocketContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [starredMessages, setStarredMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [chatSettings, setChatSettings] = useState({
    wallpaper: '',
    accent_color: '#00a884',
    is_muted: 0,
    is_archived: 0,
    is_blocked: 0,
    is_locked: 0,
    lock_pin: ''
  });
  const [callLogs, setCallLogs] = useState([]);
  const [undoMessageCandidate, setUndoMessageCandidate] = useState(null);
  const [isOnlineNetwork, setIsOnlineNetwork] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [disappearingTimer, setDisappearingTimer] = useState(0); // in seconds (0 = off)
  const [typingMap, setTypingMap] = useState({});
  const [recordingMap, setRecordingMap] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [unlockedChats, setUnlockedChats] = useState(new Set());
  const [editHistoryModalMsg, setEditHistoryModalMsg] = useState(null);
  const [chatLockModalContact, setChatLockModalContact] = useState(null);
  const [wallpaperModalContact, setWallpaperModalContact] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);     // received pending requests
  const [sentRequests, setSentRequests] = useState([]);         // sent pending requests
  const [showUserSearch, setShowUserSearch] = useState(false);  // UserSearchModal visibility
  const [showFriendRequests, setShowFriendRequests] = useState(false); // FriendRequestsModal
  const activeChatRef = useRef(activeChat);
  const undoTimeoutRef = useRef(null);

  // WebRTC Call State
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'incoming' | 'connected'
  const [callPartner, setCallPartner] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isPipMode, setIsPipMode] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef(null);
  const incomingSignalRef = useRef(null);
  const callTimerRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Track online/offline browser state
  useEffect(() => {
    const handleOnline = () => setIsOnlineNetwork(true);
    const handleOffline = () => setIsOnlineNetwork(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(apiUrl(`/api/contacts/${currentUser.id}`));
      const data = await res.json();
      if (data.contacts) {
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error('Fetch contacts failed:', err);
    }
  }, [currentUser]);

  // Fetch friend requests (received)
  const fetchFriendRequests = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [recRes, sentRes] = await Promise.all([
        fetch(apiUrl(`/api/friends/requests/${currentUser.id}`)),
        fetch(apiUrl(`/api/friends/sent/${currentUser.id}`))
      ]);
      const recData = await recRes.json();
      const sentData = await sentRes.json();
      if (recData.requests) setFriendRequests(recData.requests);
      if (sentData.requests) setSentRequests(sentData.requests);
    } catch (err) {
      console.error('Fetch friend requests failed:', err);
    }
  }, [currentUser]);

  // Send a friend request
  const sendFriendRequest = useCallback(async (receiverId) => {
    if (!currentUser) return;
    try {
      const res = await fetch(apiUrl('/api/friends/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser.id, receiverId })
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically add to sentRequests
        setSentRequests(prev => [...prev.filter(r => r.receiver_id !== receiverId), data.request]);
      }
      return data;
    } catch (err) {
      console.error('Send friend request error:', err);
    }
  }, [currentUser]);

  // Respond to a friend request
  const respondToFriendRequest = useCallback(async (requestId, status) => {
    if (!currentUser) return;
    try {
      const res = await fetch(apiUrl('/api/friends/respond'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, responderId: currentUser.id })
      });
      const data = await res.json();
      if (data.success) {
        // Remove from received list
        setFriendRequests(prev => prev.filter(r => r.id !== requestId));
        if (status === 'accepted') {
          // Contact list will refresh via contacts_updated socket event
          fetchContacts();
        }
      }
      return data;
    } catch (err) {
      console.error('Respond to friend request error:', err);
    }
  }, [currentUser, fetchContacts]);



  // Fetch messages
  const fetchMessages = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      const path = String(otherUserId).startsWith('group:')
        ? `/api/messages/${otherUserId}/${otherUserId}`
        : `/api/messages/${currentUser.id}/${otherUserId}`;
      const res = await fetch(path);
      const data = await res.json();
      if (data.messages) {
        // filter out messages deleted for me
        const visible = data.messages.filter(
          (m) => !(m.deleted_for && Array.isArray(m.deleted_for) && m.deleted_for.includes(currentUser.id))
        );
        setMessages(visible);
      }
    } catch (err) {
      console.error('Fetch messages failed:', err);
    }
  }, [currentUser]);

  // Fetch starred messages
  const fetchStarredMessages = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      const res = await fetch(apiUrl(`/api/messages/starred/${currentUser.id}/${otherUserId}`));
      const data = await res.json();
      if (data.starred) {
        setStarredMessages(data.starred);
      }
    } catch (err) {
      console.error('Fetch starred failed:', err);
    }
  }, [currentUser]);

  // Fetch pinned messages
  const fetchPinnedMessages = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      const res = await fetch(apiUrl(`/api/messages/pinned/${currentUser.id}/${otherUserId}`));
      const data = await res.json();
      if (data.pinned) {
        setPinnedMessages(data.pinned);
      }
    } catch (err) {
      console.error('Fetch pinned failed:', err);
    }
  }, [currentUser]);

  // Fetch disappearing timer
  const fetchDisappearingTimer = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      const res = await fetch(apiUrl(`/api/disappearing/${currentUser.id}/${otherUserId}`));
      const data = await res.json();
      if (data.seconds !== undefined) {
        setDisappearingTimer(data.seconds);
      }
    } catch (err) {
      console.error('Fetch disappearing timer failed:', err);
    }
  }, [currentUser]);

  // Fetch chat settings
  const fetchChatSettings = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      const res = await fetch(apiUrl(`/api/chat-settings/${currentUser.id}/${otherUserId}`));
      const data = await res.json();
      if (data.settings) {
        setChatSettings(data.settings);
      }
    } catch (err) {
      console.error('Fetch chat settings failed:', err);
    }
  }, [currentUser]);

  // Fetch call logs
  const fetchCallLogs = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(apiUrl(`/api/call-logs/${currentUser.id}`));
      const data = await res.json();
      if (data.logs) {
        setCallLogs(data.logs);
      }
    } catch (err) {
      console.error('Fetch call logs failed:', err);
    }
  }, [currentUser]);

  const clearCallLogs = useCallback(async () => {
    if (!currentUser) return false;
    const res = await fetch(apiUrl(`/api/call-logs/${currentUser.id}`), { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear call history');
    setCallLogs([]);
    return true;
  }, [currentUser]);

  // Clean WebRTC streams and peer connection
  const cleanupCall = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);
    setCallState('idle');
    setCallPartner(null);
    incomingSignalRef.current = null;
    setIsPipMode(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIsScreenSharing(false);
  }, []);

  // WebRTC Setup Helper
  const createPeerConnection = (targetUserId, isInitiator, isVideo) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', {
          to: targetUserId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    return pc;
  };

  // Socket Connection and Event Listeners
  useEffect(() => {
    if (!currentUser) {
      if (socket) socket.disconnect();
      return;
    }

    const newSocket = io(socketUrl(), {
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('user_connected', { userId: currentUser.id });
      fetchContacts();
      fetchCallLogs();
      fetchFriendRequests();

      // Flush any offline queued messages
      if (offlineQueue.length > 0) {
        offlineQueue.forEach((queued) => {
          newSocket.emit('send_direct_message', queued);
        });
        setOfflineQueue([]);
      }
    });

    // Real-time direct message received
    newSocket.on('new_direct_message', (msg) => {
      const currentActive = activeChatRef.current;
      const isForActiveChat =
        currentActive &&
        ((msg.sender_id === currentActive.id && msg.receiver_id === currentUser.id) ||
         (msg.sender_id === currentUser.id && msg.receiver_id === currentActive.id));

      if (isForActiveChat) {
        setMessages((prev) => {
          // If message is optimistic or already exists, replace or keep
          const existsIdx = prev.findIndex(
            (m) => m.id === msg.id || (msg._tempId && m._tempId === msg._tempId)
          );
          if (existsIdx >= 0) {
            const copy = [...prev];
            copy[existsIdx] = msg;
            return copy;
          }
          return [...prev, msg];
        });

        if (msg.sender_id === currentActive.id) {
          newSocket.emit('mark_read', {
            senderId: currentActive.id,
            receiverId: currentUser.id
          });
        }
      }

      if (msg.sender_id === currentUser.id) {
        if (soundEnabled) playSendSound();
      } else {
        if (soundEnabled) playReceiveSound();
      }

      setContacts((prev) => {
        const otherId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
        let found = false;
        const updated = prev.map((c) => {
          if (c.id === otherId) {
            found = true;
            const isUnread = (!currentActive || currentActive.id !== otherId) && msg.sender_id === otherId;
            return {
              ...c,
              lastMessage: msg,
              unreadCount: isUnread ? (c.unreadCount || 0) + 1 : c.unreadCount
            };
          }
          return c;
        });

        if (!found) {
          fetchContacts();
        } else {
          updated.sort((a, b) => {
            const tA = a.lastMessage ? a.lastMessage.created_at : 0;
            const tB = b.lastMessage ? b.lastMessage.created_at : 0;
            return tB - tA;
          });
        }
        return updated;
      });
    });

    newSocket.on('new_group_message', (msg) => {
      const currentActive = activeChatRef.current;
      if (currentActive?.isGroup && currentActive.id === msg.receiver_id) {
        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === msg.id || (msg._tempId && m._tempId === msg._tempId));
          if (index >= 0) {
            const copy = [...prev];
            copy[index] = msg;
            return copy;
          }
          return [...prev, msg];
        });
      }
      if (msg.sender_id !== currentUser.id && soundEnabled) playReceiveSound();
      fetchContacts();
    });

    // Typing event
    newSocket.on('user_typing', ({ senderId, isTyping }) => {
      setTypingMap((prev) => ({
        ...prev,
        [senderId]: isTyping
      }));
    });

    // Recording status event
    newSocket.on('user_recording', ({ senderId, isRecording }) => {
      setRecordingMap((prev) => ({
        ...prev,
        [senderId]: isRecording
      }));
    });

    // Messages read
    newSocket.on('messages_read', ({ readBy }) => {
      setMessages((prev) =>
        prev.map((m) => (m.receiver_id === readBy ? { ...m, status: 'read' } : m))
      );
    });

    // Message edited
    newSocket.on('message_edited', ({ messageId, newContent, editedAt }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: newContent, is_edited: 1, edited_at: editedAt } : m))
      );
      if (activeChatRef.current) {
        fetchPinnedMessages(activeChatRef.current.id);
      }
    });

    newSocket.on('one_time_media_consumed', ({ messageId, viewers }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, one_time_viewed_by: viewers } : m));
    });

    // Message deleted for me
    newSocket.on('message_deleted_for_me', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    // Message deleted for everyone
    newSocket.on('message_deleted_for_everyone', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, is_deleted_everyone: 1, content: 'This message was deleted', file_url: null, reactions: [] }
            : m
        )
      );
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
      fetchContacts();
    });

    // Pin updated
    newSocket.on('pin_updated', ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_pinned: isPinned } : m))
      );
      if (activeChatRef.current) {
        fetchPinnedMessages(activeChatRef.current.id);
      }
    });

    // Poll updated
    newSocket.on('poll_updated', ({ messageId, poll }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, metadata: poll } : m))
      );
    });

    // Chat Settings updated
    newSocket.on('chat_settings_updated', ({ contactId, settings }) => {
      if (activeChatRef.current && activeChatRef.current.id === contactId) {
        setChatSettings((prev) => ({ ...prev, ...settings }));
      }
    });

    // Block status updated
    newSocket.on('block_status_updated', ({ contactId, isBlockedByMe, isBlockedByThem }) => {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === contactId) {
            return {
              ...c,
              ...(isBlockedByMe !== undefined ? { isBlockedByMe } : {}),
              ...(isBlockedByThem !== undefined ? { isBlockedByThem } : {})
            };
          }
          return c;
        })
      );
      if (activeChatRef.current && activeChatRef.current.id === contactId) {
        setActiveChat((prev) => ({
          ...prev,
          ...(isBlockedByMe !== undefined ? { isBlockedByMe } : {}),
          ...(isBlockedByThem !== undefined ? { isBlockedByThem } : {})
        }));
      }
    });

    // Call logged
    newSocket.on('call_logged', (log) => {
      setCallLogs((prev) => [log, ...prev]);
    });

    // Scheduled message acknowledged
    newSocket.on('message_scheduled', (msg) => {
      setScheduledMessages((prev) => [...prev, msg]);
    });

    // Reaction updated
    newSocket.on('reaction_updated', ({ messageId, userId, emoji, action }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const currentReactions = msg.reactions || [];
          let newReactions;
          if (action === 'added') {
            newReactions = [...currentReactions.filter((r) => !(r.userId === userId && r.emoji === emoji)), { userId, emoji }];
          } else {
            newReactions = currentReactions.filter((r) => !(r.userId === userId && r.emoji === emoji));
          }
          return { ...msg, reactions: newReactions };
        })
      );
    });

    // Star updated
    newSocket.on('star_updated', ({ messageId, isStarred }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, is_starred: isStarred } : msg))
      );
      if (activeChatRef.current) {
        fetchStarredMessages(activeChatRef.current.id);
      }
    });

    // Disappearing timer updated
    newSocket.on('disappearing_timer_updated', ({ seconds }) => {
      setDisappearingTimer(seconds);
    });

    // Message deleted (or expired)
    newSocket.on('message_deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setStarredMessages((prev) => prev.filter((m) => m.id !== messageId));
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
      fetchContacts();
    });

    // Presence update
    newSocket.on('user_presence', ({ userId, status, isOnline, lastSeen }) => {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === userId
            ? { ...c, status, isOnline, last_seen: lastSeen || c.last_seen }
            : c
        )
      );

      if (activeChatRef.current && activeChatRef.current.id === userId) {
        setActiveChat((prev) => ({
          ...prev,
          status,
          isOnline,
          last_seen: lastSeen || prev.last_seen
        }));
      }
    });

    // Profile updated
    newSocket.on('user_profile_updated', (updatedUser) => {
      setContacts((prev) =>
        prev.map((c) => (c.id === updatedUser.id ? { ...c, ...updatedUser } : c))
      );
      if (activeChatRef.current && activeChatRef.current.id === updatedUser.id) {
        setActiveChat((prev) => ({ ...prev, ...updatedUser }));
      }
    });

    // ==========================================
    // Friend Request Socket Events
    // ==========================================

    // Someone sent us a friend request
    newSocket.on('friend_request_received', ({ request }) => {
      setFriendRequests((prev) => {
        const exists = prev.find(r => r.id === request.id);
        if (exists) return prev;
        return [request, ...prev];
      });
      // Play a subtle receive sound
      if (soundEnabled) playReceiveSound();
    });

    // Our sent request was accepted or declined
    newSocket.on('friend_request_responded', ({ requestId, status }) => {
      setSentRequests((prev) => prev.filter(r => r.id !== requestId));
      if (status === 'accepted') {
        fetchContacts();
      }
    });

    // Server tells us to refresh contacts (after accept)
    newSocket.on('contacts_updated', () => {
      fetchContacts();
      fetchFriendRequests();
    });

    // ==========================================
    // WebRTC Signaling Events
    // ==========================================
    newSocket.on('incoming_call', ({ callerId, callerName, callerAvatar, isVideo, signalData }) => {
      console.log('Incoming call from:', callerName);
      setCallState('incoming');
      setIsVideoCall(isVideo);
      setCallPartner({
        id: callerId,
        display_name: callerName,
        avatar: callerAvatar
      });
      incomingSignalRef.current = signalData;
      if (soundEnabled) playReceiveSound();
    });

    newSocket.on('call_accepted', async ({ signalData }) => {
      console.log('Call accepted by partner');
      if (pcRef.current && signalData) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signalData));
      }
      setCallState('connected');

      // Start duration timer
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    });

    newSocket.on('call_rejected', ({ reason }) => {
      console.log('Call rejected:', reason);
      if (callPartner && currentUser) {
        newSocket.emit('log_call', {
          caller_id: currentUser.id,
          receiver_id: callPartner.id,
          type: isVideoCall ? 'video' : 'voice',
          status: 'declined',
          duration: 0
        });
      }
      cleanupCall();
    });

    newSocket.on('call_ended', () => {
      console.log('Call ended by partner');
      cleanupCall();
    });

    newSocket.on('ice_candidate', async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error adding ICE candidate:', e);
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      cleanupCall();
    };
  }, [currentUser]);

  // Select chat
  const selectChat = (contact) => {
    setActiveChat(contact);
    setReplyingTo(null);
    setEditingMessage(null);
    if (contact) {
      fetchMessages(contact.isGroup ? contact.id : contact.id);
      fetchStarredMessages(contact.id);
      fetchPinnedMessages(contact.id);
      fetchDisappearingTimer(contact.id);
      fetchChatSettings(contact.id);
      if (socket && currentUser && !contact.isGroup) {
        socket.emit('mark_read', {
          senderId: contact.id,
          receiverId: currentUser.id
        });
      }
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c))
      );
    }
  };

  // Send message (with optimistic sending, undo support, & offline queue)
  const sendMessage = ({
    content,
    type = 'text',
    fileUrl = null,
    fileName = null,
    fileSize = null,
    audioDuration = null,
    scheduledAt = null,
    metadata = null
  }) => {
    if (!currentUser || !activeChat) return;

    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const optimisticMsg = {
      id: tempId,
      _tempId: tempId,
      sender_id: currentUser.id,
      receiver_id: activeChat.id,
      group_id: activeChat.isGroup ? activeChat.id : null,
      content,
      type,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      audio_duration: audioDuration,
      reply_to_id: replyingTo ? replyingTo.id : null,
      reply_content: replyingTo ? replyingTo.content : null,
      reply_sender_name: replyingTo ? (replyingTo.sender_id === currentUser.id ? 'You' : activeChat.display_name) : null,
      is_starred: 0,
      is_pinned: 0,
      is_edited: 0,
      is_deleted_everyone: 0,
      deleted_for: [],
      scheduled_at: scheduledAt,
      metadata: metadata || null,
      status: 'sending',
      created_at: Date.now(),
      reactions: []
    };

    // If not scheduled, show optimistic message immediately
    if (!scheduledAt || scheduledAt <= Date.now()) {
      setMessages((prev) => [...prev, optimisticMsg]);
      // Set undo candidate
      setUndoMessageCandidate(optimisticMsg);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setUndoMessageCandidate(null);
      }, 5000);
    }

    const payload = {
      senderId: currentUser.id,
      receiverId: activeChat.id,
      groupId: activeChat.isGroup ? activeChat.id : undefined,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      audioDuration,
      replyToId: replyingTo ? replyingTo.id : null,
      disappearingSeconds: disappearingTimer,
      scheduledAt,
      metadata,
      clientTempId: tempId
    };

    if (socket && socket.connected) {
      socket.emit(activeChat.isGroup ? 'send_group_message' : 'send_direct_message', payload, (res) => {
        if (res && res.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? res.message : m))
          );
          setUndoMessageCandidate((prev) => (prev && prev.id === tempId ? res.message : prev));
        }
      });
    } else {
      // Offline queue
      setOfflineQueue((prev) => [...prev, payload]);
    }

    setReplyingTo(null);
  };

  const createGroup = useCallback(async (name, memberIds) => {
    if (!currentUser) return null;
    const res = await fetch(apiUrl('/api/groups'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ownerId: currentUser.id, memberIds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to create group');
    await fetchContacts();
    return data.group;
  }, [currentUser, fetchContacts]);

  // Undo candidate message
  const undoSentMessage = () => {
    if (!undoMessageCandidate) return;
    const msg = undoMessageCandidate;
    setUndoMessageCandidate(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    deleteMessage(msg.id, true);
  };

  // Edit Message
  const editMessageContent = (messageId, newContent) => {
    if (!socket || !currentUser || !activeChat) return;
    socket.emit('edit_message', {
      messageId,
      userId: currentUser.id,
      newContent,
      receiverId: activeChat.id
    });
    setEditingMessage(null);
  };

  // Delete message (mode: 'for_me' or 'for_everyone')
  const deleteMessageMode = (messageId, mode = 'for_everyone') => {
    if (!socket || !currentUser || !activeChat) return;
    if (mode === 'for_me') {
      socket.emit('delete_message_for_me', {
        messageId,
        userId: currentUser.id
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } else {
      socket.emit('delete_message_for_everyone', {
        messageId,
        userId: currentUser.id,
        receiverId: activeChat.id
      });
    }
  };

  // Delete message legacy wrapper
  const deleteMessage = (messageId, forEveryone = false) => {
    deleteMessageMode(messageId, forEveryone ? 'for_everyone' : 'for_me');
  };

  const toggleMessageSelection = (messageId) => {
    setSelectedMessageIds((prev) => {
      const next = prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId];
      setIsSelectionMode(next.length > 0);
      return next;
    });
  };

  const selectAllMessages = () => {
    setSelectedMessageIds(messages.map((m) => m.id));
    setIsSelectionMode(true);
  };

  const clearMessageSelection = () => {
    setSelectedMessageIds([]);
    setIsSelectionMode(false);
  };

  const forwardMessagesTo = (items, target) => {
    if (!socket || !currentUser || !target) return;
    items.forEach((msg) => {
      socket.emit('send_direct_message', {
        senderId: currentUser.id,
        receiverId: target.id,
        content: msg.content,
        type: msg.type,
        fileUrl: msg.file_url,
        fileName: msg.file_name,
        fileSize: msg.file_size,
        audioDuration: msg.audio_duration,
        metadata: { ...(msg.metadata || {}), forwarded: true }
      });
    });
    clearMessageSelection();
  };

  const bulkDeleteMessages = (mode = 'for_me') => {
    if (selectedMessageIds.length === 0) return;
    selectedMessageIds.forEach((id) => {
      deleteMessageMode(id, mode);
    });
    clearMessageSelection();
  };

  const bulkStarMessages = () => {
    if (selectedMessageIds.length === 0) return;
    selectedMessageIds.forEach((id) => {
      toggleStar(id);
    });
    clearMessageSelection();
  };

  const exportSelectedMessages = () => {
    const selected = messages.filter((m) => selectedMessageIds.includes(m.id));
    if (selected.length === 0) return;
    const lines = selected.map((m) => {
      const sender = m.sender_id === currentUser.id ? 'You' : (activeChat?.display_name || 'Contact');
      const time = new Date(m.created_at).toLocaleString();
      const text = m.content || (m.type === 'image' ? `[Photo: ${m.file_url}]` : m.type === 'video' ? `[Video: ${m.file_url}]` : `[File: ${m.file_name || m.file_url}]`);
      return `[${time}] ${sender}: ${text}`;
    });
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ChatDirect-Export-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    clearMessageSelection();
  };

  const consumeOneTimeMedia = (messageId) => {
    if (socket && currentUser) {
      socket.emit('consume_one_time_media', { messageId, userId: currentUser.id });
    }
  };

  const getEditHistory = async (messageId) => {
    if (!currentUser) return [];
    try {
      const res = await fetch(apiUrl(`/api/messages/${messageId}/history/${currentUser.id}`));
      const data = await res.json();
      return data.history || [];
    } catch {
      return [];
    }
  };

  const blockUser = (contactId) => {
    if (!socket || !currentUser) return;
    socket.emit('block_user', { userId: currentUser.id, contactId });
    setChatSettings((prev) => ({ ...prev, is_blocked: 1 }));
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, isBlockedByMe: true } : c)));
    if (activeChat && activeChat.id === contactId) {
      setActiveChat((prev) => ({ ...prev, isBlockedByMe: true }));
    }
  };

  const unblockUser = (contactId) => {
    if (!socket || !currentUser) return;
    socket.emit('unblock_user', { userId: currentUser.id, contactId });
    setChatSettings((prev) => ({ ...prev, is_blocked: 0 }));
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, isBlockedByMe: false } : c)));
    if (activeChat && activeChat.id === contactId) {
      setActiveChat((prev) => ({ ...prev, isBlockedByMe: false }));
    }
  };

  const unlockChat = (contactId) => {
    setUnlockedChats((prev) => new Set([...prev, contactId]));
  };

  const lockChat = (contactId) => {
    setUnlockedChats((prev) => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
  };

  const setChatLock = async (contactId, isLocked, pin) => {
    await updateChatSettingsAction({ is_locked: isLocked ? 1 : 0, lock_pin: pin });
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, isLocked: isLocked ? 1 : 0 } : c)));
    if (activeChat && activeChat.id === contactId) {
      setActiveChat((prev) => ({ ...prev, isLocked: isLocked ? 1 : 0 }));
    }
    if (isLocked) {
      unlockChat(contactId);
    }
  };

  const setChatWallpaper = async (contactId, wallpaperUrl) => {
    await updateChatSettingsAction({ wallpaper: wallpaperUrl });
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, wallpaper: wallpaperUrl } : c)));
    if (activeChat && activeChat.id === contactId) {
      setActiveChat((prev) => ({ ...prev, wallpaper: wallpaperUrl }));
    }
  };

  // Pin message toggle
  const togglePin = (messageId) => {
    if (!socket || !currentUser || !activeChat) return;
    socket.emit('toggle_pin', {
      messageId,
      userId: currentUser.id,
      receiverId: activeChat.id
    });
  };

  // Vote on Poll
  const votePoll = (messageId, optionId) => {
    if (!socket || !currentUser || !activeChat) return;
    socket.emit('vote_poll', {
      messageId,
      userId: currentUser.id,
      optionId,
      receiverId: activeChat.id
    });
  };

  // Update Chat Settings
  const updateChatSettingsAction = async (newSettings) => {
    if (!currentUser || !activeChat) return;
    setChatSettings((prev) => ({ ...prev, ...newSettings }));
    try {
      await fetch(apiUrl('/api/chat-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          contactId: activeChat.id,
          settings: newSettings
        })
      });
      if (socket) {
        socket.emit('update_chat_settings', {
          userId: currentUser.id,
          contactId: activeChat.id,
          settings: newSettings
        });
      }
    } catch (err) {
      console.error('Failed to update chat settings:', err);
    }
  };

  // Typing emitter
  const sendTyping = (isTyping) => {
    if (!socket || !currentUser || !activeChat) return;
    socket.emit('typing', {
      senderId: currentUser.id,
      receiverId: activeChat.id,
      isTyping
    });
  };

  // Recording emitter
  const sendRecording = (isRecording) => {
    if (!socket || !currentUser || !activeChat) return;
    socket.emit('recording', {
      senderId: currentUser.id,
      receiverId: activeChat.id,
      isRecording
    });
  };

  // Toggle Star
  const toggleStar = (messageId) => {
    if (!socket || !currentUser || !activeChat) return;
    socket.emit('toggle_star', {
      messageId,
      userId: currentUser.id,
      receiverId: activeChat.id
    });
  };

  // Set Disappearing Timer
  const setDisappearingSeconds = async (seconds) => {
    if (!currentUser || !activeChat) return;
    setDisappearingTimer(seconds);
    try {
      await fetch(apiUrl('/api/disappearing'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userA: currentUser.id,
          userB: activeChat.id,
          seconds
        })
      });
    } catch (err) {
      console.error('Failed to set disappearing timer:', err);
    }
  };

  // Toggle Reaction
  const toggleReaction = (messageId, emoji) => {
    if (!socket || !currentUser || !activeChat) return;
    socket.emit('toggle_reaction', {
      messageId,
      userId: currentUser.id,
      emoji,
      receiverId: activeChat.id
    });
  };

  // Set User Status
  const setUserStatus = (status) => {
    if (!socket || !currentUser) return;
    socket.emit('set_user_status', {
      userId: currentUser.id,
      status
    });
  };

  // ==========================================
  // WebRTC Call Initiation and Actions
  // ==========================================
  const startCall = async ({ isVideo = false }) => {
    if (!socket || !currentUser || !activeChat) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoCall(isVideo);
      setCallPartner(activeChat);
      setCallState('calling');

      const pc = createPeerConnection(activeChat.id, true, isVideo);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        callerId: currentUser.id,
        receiverId: activeChat.id,
        isVideo,
        signalData: offer,
        callerName: currentUser.display_name,
        callerAvatar: currentUser.avatar
      });
    } catch (err) {
      console.error('Media device error:', err);
      alert('Camera / Microphone permission denied or unavailable.');
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!socket || !callPartner || !incomingSignalRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState('connected');

      const pc = createPeerConnection(callPartner.id, false, isVideoCall);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignalRef.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', {
        to: callPartner.id,
        signalData: answer,
        isVideo: isVideoCall
      });

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to accept call:', err);
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (socket && callPartner) {
      socket.emit('reject_call', { to: callPartner.id });
      if (currentUser) {
        socket.emit('log_call', {
          caller_id: callPartner.id,
          receiver_id: currentUser.id,
          type: isVideoCall ? 'video' : 'voice',
          status: 'declined',
          duration: 0
        });
      }
    }
    cleanupCall();
  };

  const endCall = () => {
    if (socket && callPartner && currentUser) {
      socket.emit('end_call', { to: callPartner.id });
      socket.emit('log_call', {
        caller_id: currentUser.id,
        receiver_id: callPartner.id,
        type: isVideoCall ? 'video' : 'voice',
        status: 'completed',
        duration: callDuration
      });
    }
    cleanupCall();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          if (localStreamRef.current) {
            const originalVideo = localStreamRef.current.getVideoTracks()[0];
            if (sender && originalVideo) sender.replaceTrack(originalVideo);
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    } else {
      if (localStreamRef.current) {
        const originalVideo = localStreamRef.current.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && originalVideo) sender.replaceTrack(originalVideo);
      }
      setIsScreenSharing(false);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isOnlineNetwork,
        contacts,
        activeChat,
        messages,
        starredMessages,
        pinnedMessages,
        scheduledMessages,
        chatSettings,
        callLogs,
        clearCallLogs,
        undoMessageCandidate,
        disappearingTimer,
        typingMap,
        recordingMap,
        soundEnabled,
        setSoundEnabled,
        replyingTo,
        setReplyingTo,
        editingMessage,
        setEditingMessage,
        lightboxMedia,
        setLightboxMedia,
        selectChat,
        sendMessage,
        createGroup,
        undoSentMessage,
        editMessageContent,
        deleteMessage,
        deleteMessageMode,
        togglePin,
        votePoll,
        updateChatSettingsAction,
        sendTyping,
        sendRecording,
        toggleReaction,
        toggleStar,
        setDisappearingSeconds,
        setUserStatus,
        fetchContacts,
        fetchStarredMessages,
        fetchPinnedMessages,
        fetchCallLogs,
        // Selection & Bulk
        selectedMessageIds,
        isSelectionMode,
        setIsSelectionMode,
        toggleMessageSelection,
        selectAllMessages,
        clearMessageSelection,
        forwardMessagesTo,
        bulkDeleteMessages,
        bulkStarMessages,
        exportSelectedMessages,
        // One-time media & Edit history
        consumeOneTimeMedia,
        getEditHistory,
        editHistoryModalMsg,
        setEditHistoryModalMsg,
        // Blocking & Locking & Wallpaper
        blockUser,
        unblockUser,
        unlockedChats,
        unlockChat,
        lockChat,
        setChatLock,
        setChatWallpaper,
        chatLockModalContact,
        setChatLockModalContact,
        wallpaperModalContact,
        setWallpaperModalContact,
        // Friend Requests
        friendRequests,
        sentRequests,
        showUserSearch,
        setShowUserSearch,
        showFriendRequests,
        setShowFriendRequests,
        sendFriendRequest,
        respondToFriendRequest,
        fetchFriendRequests,
        // WebRTC Call state & actions
        callState,
        callPartner,
        isVideoCall,
        isPipMode,
        setIsPipMode,
        localStream,
        remoteStream,
        isMicMuted,
        isCamOff,
        isScreenSharing,
        callDuration,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCam,
        toggleScreenShare
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
