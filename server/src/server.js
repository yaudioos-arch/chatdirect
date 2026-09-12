const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const {
  initDb,
  registerUser,
  loginByUsername,
  getUserByUsername,
  getUserById,
  updateUserStatus,
  updateUserProfile,
  createStory,
  getActiveStories,
  recordStoryView,
  toggleStoryLike,
  getStoryDetails,
  deleteStory,
  deleteExpiredStories,
  deleteUserAccount,
  getAllContactsWithLastMessage,
  getDirectMessages,
  saveMessage,
  editMessage,
  getEditHistory,
  consumeOneTimeMedia,
  deleteMessageForMe,
  deleteMessageForEveryone,
  togglePinMessage,
  getPinnedMessages,
  votePoll,
  getDueScheduledMessages,
  toggleStarMessage,
  getStarredMessages,
  getChatSettings,
  updateChatSettings,
  logCall,
  getCallLogs,
  clearCallLogs,
  setDisappearingTimer,
  getDisappearingTimer,
  deleteExpiredMessages,
  markMessagesAsRead,
  toggleReaction,
  searchMessages,
  deleteMessage,
  checkBlockStatus,
  sendFriendRequest,
  respondFriendRequest,
  getFriendRequests,
  getSentFriendRequests,
  getFriendshipStatus,
  searchUsers,
  createGroup,
  getGroupMessages,
  isGroupMember,
  getGroupMembers
} = require('./database');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((value) => value.trim()).filter(Boolean);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 25e6 // 25 MB max payload
});

const PORT = process.env.PORT || 5000;

// Upload directory setup
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// In-memory mapping of active socket connections
const activeSockets = new Map();
const socketUserMap = new Map();

// Helper to check if a user is online
const isUserOnline = (userId) => {
  const sockets = activeSockets.get(userId);
  return sockets && sockets.size > 0;
};

// REST API Endpoints

// Check username availability
app.get('/api/auth/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const existing = await getUserByUsername(username);
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register New User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, displayName, password, avatar, bio } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters (letters, numbers, underscores)' });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }
    if (!/[A-Za-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one alphabet letter' });
    }

    const user = await registerUser({
      username: cleanUsername,
      displayName: displayName?.trim() || cleanUsername,
      password: password,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      bio: bio?.trim() || 'Available for 1-on-1 chat'
    });

    res.json({ success: true, user });
  } catch (err) {
    if (err.code === 'USERNAME_TAKEN') {
      return res.status(409).json({ error: 'This username is already taken. Please choose another username.' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sign In with Username & Password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Please enter your username' });
    }

    const user = await loginByUsername(username, password);
    res.json({ success: true, user });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Username does not exist. Please register first.' });
    }
    if (err.code === 'INVALID_PASSWORD') {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get contacts list with last message & unread count
app.get('/api/contacts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const contacts = await getAllContactsWithLastMessage(userId);
    const enriched = contacts.map(c => ({
      ...c,
      isOnline: isUserOnline(c.id)
    }));
    res.json({ contacts: enriched });
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { name, ownerId, memberIds = [] } = req.body;
    if (!name?.trim() || !ownerId || !Array.isArray(memberIds)) return res.status(400).json({ error: 'Group name and members are required' });
    const group = await createGroup(name, ownerId, memberIds);
    const recipients = [...new Set([ownerId, ...memberIds])];
    recipients.forEach((id) => io.to(`user:${id}`).emit('groups_updated'));
    res.json({ group });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get direct messages history between two users
app.get('/api/messages/:userA/:userB', async (req, res) => {
  try {
    const { userA, userB } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const messages = userB === userA && userA.startsWith('group:')
      ? await getGroupMessages(userA, limit)
      : await getDirectMessages(userA, userB, limit);
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Starred Messages between two users
app.get('/api/messages/starred/:userA/:userB', async (req, res) => {
  try {
    const { userA, userB } = req.params;
    const starred = await getStarredMessages(userA, userB);
    res.json({ starred });
  } catch (err) {
    console.error('Get starred error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Disappearing message timer between two users
app.get('/api/disappearing/:userA/:userB', async (req, res) => {
  try {
    const { userA, userB } = req.params;
    const seconds = await getDisappearingTimer(userA, userB);
    res.json({ seconds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set Disappearing timer
app.post('/api/disappearing', async (req, res) => {
  try {
    const { userA, userB, seconds } = req.body;
    await setDisappearingTimer(userA, userB, seconds);
    io.to(`user:${userA}`).emit('disappearing_timer_updated', { userA, userB, seconds });
    io.to(`user:${userB}`).emit('disappearing_timer_updated', { userA, userB, seconds });
    res.json({ success: true, seconds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, avatar, bio, hideOnlineStatus } = req.body;
    const updated = await updateUserProfile(userId, { displayName, avatar, bio, hideOnlineStatus });
    io.emit('user_profile_updated', updated);

    // If hide_online_status is changed, emit presence accordingly
    io.emit('user_presence', {
      userId,
      status: updated.hide_online_status === 1 ? 'offline' : updated.status,
      isOnline: updated.hide_online_status === 1 ? false : isUserOnline(userId),
      lastSeen: updated.hide_online_status === 1 ? null : updated.last_seen
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Permanently delete an account and its associated data
app.delete('/api/account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body || {};
    await deleteUserAccount(userId, password);

    const userSockets = activeSockets.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        io.sockets.sockets.get(socketId)?.disconnect(true);
      }
      activeSockets.delete(userId);
    }

    io.emit('user_account_deleted', { userId });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Account not found' });
    }
    if (err.code === 'INVALID_PASSWORD') {
      return res.status(401).json({ error: 'Incorrect password. Account was not deleted.' });
    }
    console.error('Delete account error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Search messages between two users
app.get('/api/messages/search/:userA/:userB', async (req, res) => {
  try {
    const { userA, userB } = req.params;
    const { q } = req.query;
    if (!q) return res.json({ results: [] });
    const results = await searchMessages(userA, userB, q);
    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// File / Image / Voice Note Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stories', async (req, res) => {
  try {
    const { userId, content, mediaUrl, mediaType } = req.body;
    if (!userId || (!content?.trim() && !mediaUrl)) {
      return res.status(400).json({ error: 'Add text or media to publish a story' });
    }
    const story = await createStory({ userId, content, mediaUrl, mediaType });
    res.json({ success: true, story });
  } catch (err) {
    console.error('Create story error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stories/:userId', async (req, res) => {
  try {
    const stories = await getActiveStories(req.params.userId);
    res.json({ stories });
  } catch (err) {
    console.error('Get stories error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stories/:storyId/view', async (req, res) => {
  try {
    await recordStoryView(req.params.storyId, req.body.userId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/stories/:storyId/like', async (req, res) => {
  try {
    const liked = await toggleStoryLike(req.params.storyId, req.body.userId);
    res.json({ success: true, liked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/stories/:storyId/details', async (req, res) => {
  try {
    const details = await getStoryDetails(req.params.storyId, req.query.ownerId);
    if (!details) return res.status(404).json({ error: 'Story not found' });
    res.json(details);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/stories/:storyId', async (req, res) => {
  try {
    const deleted = await deleteStory(req.params.storyId, req.body.userId);
    if (!deleted) return res.status(404).json({ error: 'Story not found or not owned by you' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete story error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────
// Friend Request Endpoints
// ─────────────────────────────────────────

// Search users by username/display name
app.get('/api/users/search', async (req, res) => {
  try {
    const { q, userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const results = await searchUsers(q || '', userId);
    res.json({ users: results });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get pending received friend requests
app.get('/api/friends/requests/:userId', async (req, res) => {
  try {
    const requests = await getFriendRequests(req.params.userId);
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending sent friend requests
app.get('/api/friends/sent/:userId', async (req, res) => {
  try {
    const requests = await getSentFriendRequests(req.params.userId);
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a friend request
app.post('/api/friends/request', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) return res.status(400).json({ error: 'senderId and receiverId required' });
    const request = await sendFriendRequest(senderId, receiverId);
    // Notify receiver in real-time
    const sender = await getUserById(senderId);
    io.to(`user:${receiverId}`).emit('friend_request_received', { request: { ...request, sender } });
    res.json({ success: true, request });
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Respond to a friend request (accept / decline)
app.put('/api/friends/respond', async (req, res) => {
  try {
    const { requestId, status, responderId } = req.body;
    if (!requestId || !status) return res.status(400).json({ error: 'requestId and status required' });
    const updated = await respondFriendRequest(requestId, status);
    // Notify original sender
    io.to(`user:${updated.sender_id}`).emit('friend_request_responded', {
      requestId,
      status,
      responderId: updated.receiver_id
    });
    // If accepted, refresh both users' contacts
    if (status === 'accepted') {
      io.to(`user:${updated.sender_id}`).emit('contacts_updated');
      io.to(`user:${updated.receiver_id}`).emit('contacts_updated');
    }
    res.json({ success: true, request: updated });
  } catch (err) {
    console.error('Respond friend request error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Pinned Messages between two users
app.get('/api/messages/pinned/:userA/:userB', async (req, res) => {
  try {
    const { userA, userB } = req.params;
    const pinned = await getPinnedMessages(userA, userB);
    res.json({ pinned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:messageId/history/:userId', async (req, res) => { try { res.json({ history: await getEditHistory(req.params.messageId, req.params.userId) }); } catch (err) { res.status(500).json({ error: err.message }); } });

// Get Chat Settings
app.get('/api/chat-settings/:userId/:contactId', async (req, res) => {
  try {
    const { userId, contactId } = req.params;
    const settings = await getChatSettings(userId, contactId);
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Chat Settings
app.post('/api/chat-settings', async (req, res) => {
  try {
    const { userId, contactId, settings } = req.body;
    const updated = await updateChatSettings(userId, contactId, settings);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Call Logs
app.get('/api/call-logs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const logs = await getCallLogs(userId);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/call-logs/:userId', async (req, res) => {
  try {
    await clearCallLogs(req.params.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Clear call logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Periodic Sweeper: Disappearing Messages & Scheduled Messages
setInterval(async () => {
  try {
    // 1. Disappearing Messages
    const expiredList = await deleteExpiredMessages();
    if (expiredList && expiredList.length > 0) {
      for (const m of expiredList) {
        io.to(`user:${m.sender_id}`).emit('message_deleted', { messageId: m.id, expired: true });
        io.to(`user:${m.receiver_id}`).emit('message_deleted', { messageId: m.id, expired: true });
      }
    }

    // 2. Scheduled Messages Due
    const dueScheduled = await getDueScheduledMessages();
    if (dueScheduled && dueScheduled.length > 0) {
      for (const m of dueScheduled) {
        io.to(`user:${m.sender_id}`).emit('new_direct_message', m);
        io.to(`user:${m.receiver_id}`).emit('new_direct_message', m);
      }
    }

    // 3. Remove stories after their 24-hour lifetime
    await deleteExpiredStories();
  } catch (err) {
    console.error('Periodic background sweeper error:', err);
  }
}, 1000);

// Socket.IO Real-Time Handlers
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // When a user authenticates & connects
  socket.on('user_connected', async ({ userId }) => {
    if (!userId) return;

    socketUserMap.set(socket.id, userId);

    if (!activeSockets.has(userId)) {
      activeSockets.set(userId, new Set());
    }
    activeSockets.get(userId).add(socket.id);

    socket.join(`user:${userId}`);
    await updateUserStatus(userId, 'online');

    const userObj = await getUserById(userId);
    if (!userObj || userObj.hide_online_status !== 1) {
      io.emit('user_presence', {
        userId,
        status: 'online',
        isOnline: true,
        lastSeen: Date.now()
      });

    }
  });

  socket.on('send_group_message', async (data, callback) => {
    try {
      const { senderId, groupId, content, type = 'text', fileUrl = null, fileName = null,
        fileSize = null, audioDuration = null, replyToId = null, scheduledAt = null,
        metadata = null, clientTempId = null } = data;
      if (!senderId || !groupId || !groupId.startsWith('group:') || !(await isGroupMember(groupId, senderId))) {
        if (callback) callback({ error: 'You are not a member of this group' });
        return;
      }
      const savedMsg = await saveMessage({ id: uuidv4(), sender_id: senderId, receiver_id: groupId,
        content, type, file_url: fileUrl, file_name: fileName, file_size: fileSize,
        audio_duration: audioDuration, reply_to_id: replyToId, scheduled_at: scheduledAt, metadata });
      const broadcastMsg = { ...savedMsg, _tempId: clientTempId, group_id: groupId };
      const recipients = await getGroupMembers(groupId);
      recipients.forEach((id) => io.to(`user:${id}`).emit('new_group_message', broadcastMsg));
      if (callback) callback({ success: true, message: broadcastMsg });
    } catch (err) {
      console.error('Send group message error:', err);
      if (callback) callback({ error: err.message });
    }
  });

  // Direct 1-on-1 message event
  socket.on('send_direct_message', async (data, callback) => {
    try {
      const {
        senderId,
        receiverId,
        content,
        type = 'text',
        fileUrl = null,
        fileName = null,
        fileSize = null,
        audioDuration = null,
        replyToId = null,
        disappearingSeconds = null,
        scheduledAt = null,
        metadata = null,
        clientTempId = null
      } = data;

      if (!senderId || !receiverId) {
        if (callback) callback({ error: 'Sender and receiver are required' });
        return;
      }

      // Check friendship — users must be accepted friends to message each other
      const friendship = await getFriendshipStatus(senderId, receiverId);
      if (!friendship || friendship.status !== 'accepted') {
        if (callback) callback({ error: 'You must be friends to send messages. Send a friend request first.' });
        return;
      }

      // Check block status between users
      const blockStatus = await checkBlockStatus(senderId, receiverId);
      if (blockStatus.blockedBySender) {
        if (callback) callback({ error: 'You have blocked this contact. Unblock to send messages.' });
        return;
      }
      if (blockStatus.blockedByReceiver) {
        if (callback) callback({ error: 'You cannot send messages to this contact.' });
        return;
      }

      // Check if conversation has an active disappearing timer setting if not provided
      let effectiveDisappearingSeconds = disappearingSeconds;
      if (effectiveDisappearingSeconds === undefined || effectiveDisappearingSeconds === null) {
        effectiveDisappearingSeconds = await getDisappearingTimer(senderId, receiverId);
      }

      const msgId = uuidv4();
      const savedMsg = await saveMessage({
        id: msgId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        type,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        audio_duration: audioDuration,
        reply_to_id: replyToId,
        disappearing_seconds: effectiveDisappearingSeconds,
        scheduled_at: scheduledAt,
        metadata
      });

      // Attach clientTempId to the response object for seamless deduplication on client
      const broadcastMsg = { ...savedMsg, _tempId: clientTempId };

      // If not scheduled for the future, broadcast immediately
      if (!scheduledAt || scheduledAt <= Date.now()) {
        io.to(`user:${receiverId}`).emit('new_direct_message', broadcastMsg);
        io.to(`user:${senderId}`).emit('new_direct_message', broadcastMsg);
      } else {
        // Acknowledge scheduled to sender only
        io.to(`user:${senderId}`).emit('message_scheduled', broadcastMsg);
      }

      if (callback) callback({ success: true, message: broadcastMsg });
    } catch (err) {
      console.error('Send direct message error:', err);
      if (callback) callback({ error: err.message });
    }
  });

  // Edit message
  socket.on('edit_message', async ({ messageId, userId, newContent, receiverId }) => {
    try {
      const updated = await editMessage(messageId, userId, newContent);
      if (updated) {
        const payload = { messageId, newContent, editedAt: updated.edited_at };
        io.to(`user:${userId}`).emit('message_edited', payload);
        if (receiverId) {
          io.to(`user:${receiverId}`).emit('message_edited', payload);
        }
      }
    } catch (err) {
      console.error('Edit message error:', err);
    }
  });

  socket.on('consume_one_time_media', async ({ messageId, userId }) => {
    try {
      const res = await consumeOneTimeMedia(messageId, userId);
      if (res) {
        io.to(`user:${res.sender_id}`).emit('one_time_media_consumed', { messageId, viewers: res.viewers });
        io.to(`user:${res.receiver_id}`).emit('one_time_media_consumed', { messageId, viewers: res.viewers });
      }
    } catch (err) {
      console.error('One-time media error:', err);
    }
  });

  // Delete message for me
  socket.on('delete_message_for_me', async ({ messageId, userId }) => {
    try {
      await deleteMessageForMe(messageId, userId);
      io.to(`user:${userId}`).emit('message_deleted_for_me', { messageId });
    } catch (err) {
      console.error('Delete message for me error:', err);
    }
  });

  // Delete message for everyone
  socket.on('delete_message_for_everyone', async ({ messageId, userId, receiverId }) => {
    try {
      const updated = await deleteMessageForEveryone(messageId, userId);
      if (updated) {
        const payload = { messageId, isDeletedEveryone: true };
        io.to(`user:${userId}`).emit('message_deleted_for_everyone', payload);
        if (receiverId) {
          io.to(`user:${receiverId}`).emit('message_deleted_for_everyone', payload);
        }
      }
    } catch (err) {
      console.error('Delete for everyone error:', err);
    }
  });

  // Pin / Unpin message
  socket.on('toggle_pin', async ({ messageId, userId, receiverId }) => {
    try {
      const isPinned = await togglePinMessage(messageId);
      const payload = { messageId, isPinned };
      io.to(`user:${userId}`).emit('pin_updated', payload);
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('pin_updated', payload);
      }
    } catch (err) {
      console.error('Pin message error:', err);
    }
  });

  // Vote on Poll
  socket.on('vote_poll', async ({ messageId, userId, optionId, receiverId }) => {
    try {
      const updatedPoll = await votePoll(messageId, userId, optionId);
      if (updatedPoll) {
        const payload = { messageId, poll: updatedPoll };
        io.to(`user:${userId}`).emit('poll_updated', payload);
        if (receiverId) {
          io.to(`user:${receiverId}`).emit('poll_updated', payload);
        }
      }
    } catch (err) {
      console.error('Vote poll error:', err);
    }
  });

  // Save Call Log
  socket.on('log_call', async (callData) => {
    try {
      const log = await logCall(callData);
      io.to(`user:${callData.caller_id}`).emit('call_logged', log);
      io.to(`user:${callData.receiver_id}`).emit('call_logged', log);
    } catch (err) {
      console.error('Log call error:', err);
    }
  });

  // Chat Settings Update via Socket
  socket.on('update_chat_settings', async ({ userId, contactId, settings }) => {
    try {
      const updated = await updateChatSettings(userId, contactId, settings);
      io.to(`user:${userId}`).emit('chat_settings_updated', { contactId, settings: updated });
    } catch (err) {
      console.error('Update chat settings socket error:', err);
    }
  });

  // Block User
  socket.on('block_user', async ({ userId, contactId }) => {
    try {
      const updated = await updateChatSettings(userId, contactId, { is_blocked: 1 });
      io.to(`user:${userId}`).emit('chat_settings_updated', { contactId, settings: updated });
      io.to(`user:${userId}`).emit('block_status_updated', { contactId, isBlockedByMe: true });
      io.to(`user:${contactId}`).emit('block_status_updated', { contactId: userId, isBlockedByThem: true });
    } catch (err) {
      console.error('Block user error:', err);
    }
  });

  // Unblock User
  socket.on('unblock_user', async ({ userId, contactId }) => {
    try {
      const updated = await updateChatSettings(userId, contactId, { is_blocked: 0 });
      io.to(`user:${userId}`).emit('chat_settings_updated', { contactId, settings: updated });
      io.to(`user:${userId}`).emit('block_status_updated', { contactId, isBlockedByMe: false });
      io.to(`user:${contactId}`).emit('block_status_updated', { contactId: userId, isBlockedByThem: false });
    } catch (err) {
      console.error('Unblock user error:', err);
    }
  });

  // Typing indicator
  socket.on('typing', ({ senderId, receiverId, isTyping }) => {
    io.to(`user:${receiverId}`).emit('user_typing', {
      senderId,
      receiverId,
      isTyping
    });
  });

  // Mark messages as read
  socket.on('mark_read', async ({ senderId, receiverId }) => {
    try {
      await markMessagesAsRead(senderId, receiverId);
      io.to(`user:${senderId}`).emit('messages_read', {
        readBy: receiverId,
        conversationWith: senderId
      });
    } catch (err) {
      console.error('Mark read error:', err);
    }
  });

  // Emoji reaction toggle
  socket.on('toggle_reaction', async ({ messageId, userId, emoji, receiverId }) => {
    try {
      const result = await toggleReaction(messageId, userId, emoji);
      const payload = {
        messageId,
        userId,
        emoji,
        action: result.action
      };
      io.to(`user:${userId}`).emit('reaction_updated', payload);
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('reaction_updated', payload);
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  });

  // Star message toggle
  socket.on('toggle_star', async ({ messageId, userId, receiverId }) => {
    try {
      const isStarred = await toggleStarMessage(messageId);
      const payload = { messageId, isStarred };
      io.to(`user:${userId}`).emit('star_updated', payload);
      if (receiverId) {
        io.to(`user:${receiverId}`).emit('star_updated', payload);
      }
    } catch (err) {
      console.error('Star error:', err);
    }
  });

  // Delete message
  socket.on('delete_message', async ({ messageId, userId, receiverId }) => {
    try {
      const deleted = await deleteMessage(messageId, userId);
      if (deleted) {
        const payload = { messageId, deletedBy: userId };
        io.to(`user:${userId}`).emit('message_deleted', payload);
        if (receiverId) {
          io.to(`user:${receiverId}`).emit('message_deleted', payload);
        }
      }
    } catch (err) {
      console.error('Delete message error:', err);
    }
  });

  // WebRTC 1-on-1 Audio/Video Call Signaling
  socket.on('call_user', ({ callerId, receiverId, isVideo, signalData, callerName, callerAvatar }) => {
    console.log(`Call initiated from ${callerId} to ${receiverId}, video: ${isVideo}`);
    io.to(`user:${receiverId}`).emit('incoming_call', {
      callerId,
      callerName,
      callerAvatar,
      isVideo,
      signalData
    });
  });

  socket.on('answer_call', ({ to, signalData, isVideo }) => {
    console.log(`Call answered by user sending to ${to}`);
    io.to(`user:${to}`).emit('call_accepted', { signalData, isVideo });
  });

  socket.on('reject_call', ({ to, reason }) => {
    console.log(`Call rejected to ${to}`);
    io.to(`user:${to}`).emit('call_rejected', { reason: reason || 'Call declined' });
  });

  socket.on('end_call', ({ to }) => {
    console.log(`Call ended to ${to}`);
    io.to(`user:${to}`).emit('call_ended');
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    io.to(`user:${to}`).emit('ice_candidate', { candidate });
  });

  // Custom user status change (online / away / dnd)
  socket.on('set_user_status', async ({ userId, status }) => {
    try {
      await updateUserStatus(userId, status);
      const user = await getUserById(userId);
      if (user && user.hide_online_status === 1) {
        // User has hidden online status, keep them appearing offline to others
        io.emit('user_presence', {
          userId,
          status: 'offline',
          isOnline: false,
          lastSeen: null
        });
      } else {
        io.emit('user_presence', {
          userId,
          status,
          isOnline: status !== 'offline',
          lastSeen: Date.now()
        });
      }
    } catch (err) {
      console.error('Set status error:', err);
    }
  });

  // Disconnect handler
  socket.on('disconnect', async () => {
    const userId = socketUserMap.get(socket.id);
    socketUserMap.delete(socket.id);

    if (userId && activeSockets.has(userId)) {
      const userSockets = activeSockets.get(userId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        activeSockets.delete(userId);
        const lastSeen = Date.now();
        await updateUserStatus(userId, 'offline');
        io.emit('user_presence', {
          userId,
          status: 'offline',
          isOnline: false,
          lastSeen
        });
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Start Server
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 1-on-1 Chat Server running on port ${PORT}`);
    console.log(`📁 Uploads served from ${uploadsDir}`);
    console.log(`========================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
