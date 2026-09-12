const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Password hashing with PBKDF2
const hashPassword = (password) => {
  if (!password) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash) return true; // Support legacy users created without password
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
};

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'chat.db');
const db = new sqlite3.Database(dbPath);

// Helper for promise queries
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Initialize tables
const initDb = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password TEXT DEFAULT '',
      avatar TEXT,
      bio TEXT DEFAULT '',
      status TEXT DEFAULT 'online',
      last_seen INTEGER,
      created_at INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'text',
      file_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      audio_duration REAL,
      reply_to_id TEXT,
      is_starred INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      is_edited INTEGER DEFAULT 0,
      edited_at INTEGER,
      is_deleted_everyone INTEGER DEFAULT 0,
      deleted_for TEXT DEFAULT '[]',
      scheduled_at INTEGER,
      metadata TEXT,
      expires_at INTEGER,
      disappearing_seconds INTEGER,
      one_time_viewed_by TEXT DEFAULT '[]',
      status TEXT DEFAULT 'sent',
      created_at INTEGER NOT NULL,
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(receiver_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS disappearing_settings (
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      seconds INTEGER DEFAULT 0,
      updated_at INTEGER,
      PRIMARY KEY (user_a, user_b)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS chat_settings (
      user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      wallpaper TEXT DEFAULT '',
      accent_color TEXT DEFAULT '#00a884',
      is_muted INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      is_blocked INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      lock_pin TEXT DEFAULT '',
      PRIMARY KEY (user_id, contact_id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS call_logs (
      id TEXT PRIMARY KEY,
      caller_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      type TEXT DEFAULT 'voice',
      status TEXT DEFAULT 'completed',
      duration INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT DEFAULT '',
      media_url TEXT,
      media_type TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
  await run(`CREATE TABLE IF NOT EXISTS story_views (story_id TEXT NOT NULL, user_id TEXT NOT NULL, viewed_at INTEGER NOT NULL, PRIMARY KEY (story_id, user_id))`);
  await run(`CREATE TABLE IF NOT EXISTS story_likes (story_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (story_id, user_id))`);

  await run(`CREATE TABLE IF NOT EXISTS message_edit_history (id INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT NOT NULL, content TEXT NOT NULL, edited_at INTEGER NOT NULL)`);

  try { await run(`ALTER TABLE users ADD COLUMN hide_online_status INTEGER DEFAULT 0`); } catch (_) {}
  try { await run(`ALTER TABLE users ADD COLUMN password TEXT DEFAULT ''`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN is_starred INTEGER DEFAULT 0`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN is_edited INTEGER DEFAULT 0`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN edited_at INTEGER`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN is_deleted_everyone INTEGER DEFAULT 0`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN deleted_for TEXT DEFAULT '[]'`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN scheduled_at INTEGER`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN metadata TEXT`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN expires_at INTEGER`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN disappearing_seconds INTEGER`); } catch (_) {}
  try { await run(`ALTER TABLE messages ADD COLUMN one_time_viewed_by TEXT DEFAULT '[]'`); } catch (_) {}

  await run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at INTEGER,
      UNIQUE(message_id, user_id, emoji),
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      UNIQUE(sender_id, receiver_id),
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(receiver_id) REFERENCES users(id)
    )
  `);
  await run(`CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL, created_at INTEGER NOT NULL,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at INTEGER NOT NULL,
    PRIMARY KEY(group_id, user_id), FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Create indexes for performance
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id, created_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_reactions_msg ON reactions(message_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages(expires_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON messages(scheduled_at)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_call_logs_users ON call_logs(caller_id, receiver_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id, status)`);

  // Remove any legacy demo accounts
  await run(`DELETE FROM users WHERE id IN ('user_sophia', 'user_liam', 'user_emma')`);

  console.log('Database initialized successfully at', dbPath);
};

// User operations
const getUserByUsername = async (username) => {
  if (!username) return null;
  return await get(`SELECT * FROM users WHERE LOWER(username) = LOWER(?)`, [username.trim()]);
};

const getUserById = async (id) => {
  if (!id) return null;
  const user = await get(`SELECT * FROM users WHERE id = ?`, [id]);
  if (user && user.password !== undefined) {
    const { password, ...safeUser } = user;
    return safeUser;
  }
  return user;
};

const registerUser = async ({ id, username, displayName, password, avatar, bio }) => {
  const cleanUsername = username.trim().toLowerCase();
  const existing = await getUserByUsername(cleanUsername);

  if (existing) {
    const error = new Error('Username is already taken');
    error.code = 'USERNAME_TAKEN';
    throw error;
  }

  const now = Date.now();
  const userId = id || uuidv4();
  const hashedPassword = password ? hashPassword(password) : '';
  await run(
    `INSERT INTO users (id, username, display_name, password, avatar, bio, status, last_seen, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'online', ?, ?)`,
    [
      userId,
      cleanUsername,
      displayName?.trim() || cleanUsername,
      hashedPassword,
      avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      bio?.trim() || 'Available for 1-on-1 chat',
      now,
      now
    ]
  );
  return await getUserById(userId);
};

const loginByUsername = async (username, password) => {
  const cleanUsername = username.trim().toLowerCase();
  const user = await getUserByUsername(cleanUsername);
  if (!user) {
    const error = new Error('Username not found');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  // If user has a password set, verify it
  if (user.password && user.password.trim() !== '') {
    if (!password) {
      const error = new Error('Password is required');
      error.code = 'INVALID_PASSWORD';
      throw error;
    }
    const isMatch = verifyPassword(password, user.password);
    if (!isMatch) {
      const error = new Error('Incorrect password');
      error.code = 'INVALID_PASSWORD';
      throw error;
    }
  }

  const now = Date.now();
  await run(`UPDATE users SET status = 'online', last_seen = ? WHERE id = ?`, [now, user.id]);
  return await getUserById(user.id);
};

const updateUserStatus = async (userId, status) => {
  const now = Date.now();
  await run(`UPDATE users SET status = ?, last_seen = ? WHERE id = ?`, [status, now, userId]);
  return await get(`SELECT * FROM users WHERE id = ?`, [userId]);
};

const updateUserProfile = async (userId, { displayName, avatar, bio, hideOnlineStatus }) => {
  const updates = [];
  const params = [];
  if (displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(displayName);
  }
  if (avatar !== undefined) {
    updates.push('avatar = ?');
    params.push(avatar);
  }
  if (bio !== undefined) {
    updates.push('bio = ?');
    params.push(bio);
  }
  if (hideOnlineStatus !== undefined) {
    updates.push('hide_online_status = ?');
    params.push(hideOnlineStatus ? 1 : 0);
  }
  if (updates.length === 0) return await get(`SELECT * FROM users WHERE id = ?`, [userId]);

  params.push(userId);
  await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  return await get(`SELECT * FROM users WHERE id = ?`, [userId]);
};

const createStory = async ({ userId, content, mediaUrl, mediaType }) => {
  const now = Date.now();
  const story = {
    id: uuidv4(),
    user_id: userId,
    content: content?.trim() || '',
    media_url: mediaUrl || null,
    media_type: mediaType || null,
    created_at: now,
    expires_at: now + 24 * 60 * 60 * 1000
  };
  await run(
    `INSERT INTO stories (id, user_id, content, media_url, media_type, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [story.id, story.user_id, story.content, story.media_url, story.media_type, story.created_at, story.expires_at]
  );
  return story;
};

const getActiveStories = async (userId) => {
  await run(`DELETE FROM stories WHERE expires_at <= ?`, [Date.now()]);
  return await all(
    `SELECT s.*, u.username, u.display_name, u.avatar
     FROM stories s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = ?
        OR EXISTS (
          SELECT 1 FROM friend_requests fr
          WHERE fr.status = 'accepted'
            AND ((fr.sender_id = ? AND fr.receiver_id = s.user_id)
              OR (fr.receiver_id = ? AND fr.sender_id = s.user_id))
        )
     ORDER BY s.created_at DESC`,
    [userId, userId, userId]
  );
};

const recordStoryView = async (storyId, userId) => {
  const story = await get(`SELECT user_id FROM stories WHERE id = ?`, [storyId]);
  if (!story) return;
  if (String(story.user_id) === String(userId)) {
    await run(`DELETE FROM story_views WHERE story_id = ? AND user_id = ?`, [storyId, userId]);
    return;
  }
  await run(`INSERT OR REPLACE INTO story_views (story_id, user_id, viewed_at) VALUES (?, ?, ?)`, [storyId, userId, Date.now()]);
};

const toggleStoryLike = async (storyId, userId) => {
  const existing = await get(`SELECT 1 FROM story_likes WHERE story_id = ? AND user_id = ?`, [storyId, userId]);
  if (existing) {
    await run(`DELETE FROM story_likes WHERE story_id = ? AND user_id = ?`, [storyId, userId]);
    return false;
  }
  await run(`INSERT INTO story_likes (story_id, user_id, created_at) VALUES (?, ?, ?)`, [storyId, userId, Date.now()]);
  return true;
};

const getStoryDetails = async (storyId, ownerId) => {
  const story = await get(`SELECT * FROM stories WHERE id = ? AND user_id = ?`, [storyId, ownerId]);
  if (!story) return null;
  const viewers = await all(`SELECT u.id, u.display_name, u.username, u.avatar, v.viewed_at FROM story_views v JOIN users u ON u.id = v.user_id WHERE v.story_id = ? AND v.user_id != ? ORDER BY v.viewed_at DESC`, [storyId, ownerId]);
  const likes = await all(`SELECT u.id, u.display_name, u.username, u.avatar, l.created_at FROM story_likes l JOIN users u ON u.id = l.user_id WHERE l.story_id = ? ORDER BY l.created_at DESC`, [storyId]);
  return { story, viewers, likes };
};

const deleteStory = async (storyId, userId) => {
  const story = await get(`SELECT id FROM stories WHERE id = ? AND user_id = ?`, [storyId, userId]);
  if (!story) return false;
  await run(`DELETE FROM story_views WHERE story_id = ?`, [storyId]);
  await run(`DELETE FROM story_likes WHERE story_id = ?`, [storyId]);
  await run(`DELETE FROM stories WHERE id = ? AND user_id = ?`, [storyId, userId]);
  return true;
};

const deleteExpiredStories = async () => {
  const result = await run(`DELETE FROM stories WHERE expires_at <= ?`, [Date.now()]);
  return result.changes || 0;
};

const deleteUserAccount = async (userId, password) => {
  const user = await get(`SELECT id, password FROM users WHERE id = ?`, [userId]);
  if (!user) {
    const error = new Error('Account not found');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (user.password && !verifyPassword(password || '', user.password)) {
    const error = new Error('Incorrect password');
    error.code = 'INVALID_PASSWORD';
    throw error;
  }

  await run('BEGIN TRANSACTION');
  try {
    await run(
      `DELETE FROM message_edit_history
       WHERE message_id IN (
         SELECT id FROM messages WHERE sender_id = ? OR receiver_id = ?
       )`,
      [userId, userId]
    );
    await run(
      `DELETE FROM reactions
       WHERE user_id = ?
          OR message_id IN (
            SELECT id FROM messages WHERE sender_id = ? OR receiver_id = ?
          )`,
      [userId, userId, userId]
    );
    await run(`DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?`, [userId, userId]);
    await run(
      `DELETE FROM disappearing_settings
       WHERE user_a = ? OR user_b = ?`,
      [userId, userId]
    );
    await run(
      `DELETE FROM chat_settings
       WHERE user_id = ? OR contact_id = ?`,
      [userId, userId]
    );
    await run(
      `DELETE FROM call_logs
       WHERE caller_id = ? OR receiver_id = ?`,
      [userId, userId]
    );
    await run(
      `DELETE FROM friend_requests
       WHERE sender_id = ? OR receiver_id = ?`,
      [userId, userId]
    );
    await run(`DELETE FROM stories WHERE user_id = ?`, [userId]);
    await run(`DELETE FROM users WHERE id = ?`, [userId]);
    await run('COMMIT');
  } catch (error) {
    try {
      await run('ROLLBACK');
    } catch (rollbackError) {
      console.error('Account deletion rollback error:', rollbackError);
    }
    throw error;
  }
};

const getAllContactsWithLastMessage = async (currentUserId) => {
  // Only show users who have an accepted friend request with current user
  const friendRows = await all(
    `SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as friend_id
     FROM friend_requests
     WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
    [currentUserId, currentUserId, currentUserId]
  );
  const friendIds = friendRows.map(r => r.friend_id);
  const contacts = [];

  const placeholders = friendIds.map(() => '?').join(',');
  const users = friendIds.length ? await all(
    `SELECT id, username, display_name, avatar, bio, status, last_seen, hide_online_status FROM users WHERE id IN (${placeholders})`,
    friendIds
  ) : [];

  for (const user of users) {
    // Get last message exchanged
    const lastMsg = await get(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at DESC LIMIT 1`,
      [currentUserId, user.id, user.id, currentUserId]
    );

    // Get unread count sent from this user to current user
    const unreadRow = await get(
      `SELECT COUNT(*) as unread FROM messages 
       WHERE sender_id = ? AND receiver_id = ? AND status != 'read'`,
      [user.id, currentUserId]
    );

    // Check chat settings for both current user and contact
    const mySettings = await get(`SELECT is_blocked, is_locked, lock_pin, wallpaper FROM chat_settings WHERE user_id = ? AND contact_id = ?`, [currentUserId, user.id]);
    const theirSettings = await get(`SELECT is_blocked FROM chat_settings WHERE user_id = ? AND contact_id = ?`, [user.id, currentUserId]);

    const isBlockedByMe = mySettings ? mySettings.is_blocked === 1 : false;
    const isBlockedByThem = theirSettings ? theirSettings.is_blocked === 1 : false;
    const isLocked = mySettings ? mySettings.is_locked === 1 : false;

    // If contact has hide_online_status enabled, mask presence
    const effectiveStatus = user.hide_online_status === 1 ? 'offline' : user.status;
    const effectiveLastSeen = user.hide_online_status === 1 ? null : user.last_seen;

    contacts.push({
      ...user,
      status: effectiveStatus,
      last_seen: effectiveLastSeen,
      lastMessage: lastMsg || null,
      unreadCount: unreadRow ? unreadRow.unread : 0,
      isBlockedByMe,
      isBlockedByThem,
      isLocked,
      wallpaper: mySettings ? mySettings.wallpaper : ''
    });
  }

  // Sort contacts: those with recent messages first
  contacts.sort((a, b) => {
    const timeA = a.lastMessage ? a.lastMessage.created_at : 0;
    const timeB = b.lastMessage ? b.lastMessage.created_at : 0;
    return timeB - timeA;
  });

  const groups = await all(`SELECT g.id, g.name, g.owner_id, g.created_at
    FROM groups g JOIN group_members gm ON gm.group_id = g.id
    WHERE gm.user_id = ? ORDER BY g.created_at DESC`, [currentUserId]);
  for (const group of groups) {
    const lastMessage = await get(`SELECT * FROM messages WHERE receiver_id = ? ORDER BY created_at DESC LIMIT 1`, [group.id]);
    const unread = await get(`SELECT COUNT(*) AS unread FROM messages WHERE receiver_id = ? AND sender_id != ? AND status != 'read'`, [group.id, currentUserId]);
    const members = await all(`SELECT u.id, u.username, u.display_name, u.avatar FROM users u
      JOIN group_members gm ON gm.user_id = u.id WHERE gm.group_id = ?`, [group.id]);
    contacts.push({
      id: group.id, display_name: group.name, username: group.name, avatar: null,
      isGroup: true, owner_id: group.owner_id, members, lastMessage: lastMessage || null,
      unreadCount: unread ? unread.unread : 0, status: 'online', isOnline: true
    });
  }
  contacts.sort((a, b) => (b.lastMessage?.created_at || 0) - (a.lastMessage?.created_at || 0));
  return contacts;
};

const createGroup = async (name, ownerId, memberIds = []) => {
  const id = `group:${uuidv4()}`;
  const uniqueMembers = [...new Set([ownerId, ...memberIds])];
  await run('BEGIN');
  try {
    await run(`INSERT INTO groups (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)`, [id, name.trim(), ownerId, Date.now()]);
    for (const memberId of uniqueMembers) {
      await run(`INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?, ?, ?)`, [id, memberId, Date.now()]);
    }
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
  return { id, display_name: name.trim(), username: name.trim(), isGroup: true, owner_id: ownerId,
    members: await all(`SELECT u.id, u.username, u.display_name, u.avatar FROM users u JOIN group_members gm ON gm.user_id = u.id WHERE gm.group_id = ?`, [id]) };
};

const getGroupMessages = async (groupId, limit = 100) => {
  const messages = await all(`SELECT m.*, u.display_name as sender_name, u.avatar as sender_avatar
    FROM messages m LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.receiver_id = ? AND (m.scheduled_at IS NULL OR m.scheduled_at <= ?)
    ORDER BY m.created_at ASC LIMIT ?`, [groupId, Date.now(), limit]);
  return messages.map((message) => {
    if (message.metadata && typeof message.metadata === 'string') {
      try { message.metadata = JSON.parse(message.metadata); } catch (_) {}
    }
    try { message.deleted_for = JSON.parse(message.deleted_for || '[]'); } catch (_) { message.deleted_for = []; }
    message.reactions = [];
    return message;
  });
};
const isGroupMember = async (groupId, userId) => {
  const row = await get(`SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId]);
  return Boolean(row);
};
const getGroupMembers = async (groupId) => {
  const rows = await all(`SELECT user_id FROM group_members WHERE group_id = ?`, [groupId]);
  return rows.map((row) => row.user_id);
};

const getDirectMessages = async (userA, userB, limit = 100) => {
  const messages = await all(
    `SELECT m.*, 
            r.content as reply_content, 
            r.sender_id as reply_sender_id,
            ru.display_name as reply_sender_name
     FROM messages m
     LEFT JOIN messages r ON m.reply_to_id = r.id
     LEFT JOIN users ru ON r.sender_id = ru.id
     WHERE ((m.sender_id = ? AND m.receiver_id = ?) 
        OR (m.sender_id = ? AND m.receiver_id = ?))
       AND (m.scheduled_at IS NULL OR m.scheduled_at <= ?)
     ORDER BY m.created_at ASC
     LIMIT ?`,
    [userA, userB, userB, userA, Date.now(), limit]
  );

  // Attach reactions and parse metadata/deleted_for
  const messageIds = messages.map(m => m.id);
  if (messageIds.length > 0) {
    const placeholders = messageIds.map(() => '?').join(',');
    const reactions = await all(
      `SELECT r.message_id, r.user_id, r.emoji, u.display_name
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.message_id IN (${placeholders})`,
      messageIds
    );

    const reactionMap = {};
    for (const r of reactions) {
      if (!reactionMap[r.message_id]) reactionMap[r.message_id] = [];
      reactionMap[r.message_id].push({
        userId: r.user_id,
        emoji: r.emoji,
        displayName: r.display_name
      });
    }

    for (const msg of messages) {
      msg.reactions = reactionMap[msg.id] || [];
      if (msg.metadata && typeof msg.metadata === 'string') {
        try { msg.metadata = JSON.parse(msg.metadata); } catch (_) {}
      }
      if (msg.deleted_for && typeof msg.deleted_for === 'string') {
        try { msg.deleted_for = JSON.parse(msg.deleted_for); } catch (_) { msg.deleted_for = []; }
      } else if (!msg.deleted_for) {
        msg.deleted_for = [];
      }
    }
  }

  return messages;
};

const saveMessage = async ({
  id,
  sender_id,
  receiver_id,
  content,
  type = 'text',
  file_url = null,
  file_name = null,
  file_size = null,
  audio_duration = null,
  reply_to_id = null,
  disappearing_seconds = null,
  scheduled_at = null,
  metadata = null
}) => {
  const now = Date.now();
  const expires_at = disappearing_seconds && disappearing_seconds > 0 ? now + (disappearing_seconds * 1000) : null;
  const metadataStr = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;

  await run(
    `INSERT INTO messages (
       id, sender_id, receiver_id, content, type, file_url, file_name, file_size,
       audio_duration, reply_to_id, is_starred, is_pinned, is_edited, edited_at,
       is_deleted_everyone, deleted_for, scheduled_at, metadata, expires_at,
       disappearing_seconds, status, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, NULL, 0, '[]', ?, ?, ?, ?, 'sent', ?)`,
    [
      id, sender_id, receiver_id, content, type, file_url, file_name, file_size,
      audio_duration, reply_to_id, scheduled_at, metadataStr, expires_at,
      disappearing_seconds, now
    ]
  );

  const row = await get(
    `SELECT m.*, 
            r.content as reply_content, 
            r.sender_id as reply_sender_id,
            ru.display_name as reply_sender_name
     FROM messages m
     LEFT JOIN messages r ON m.reply_to_id = r.id
     LEFT JOIN users ru ON r.sender_id = ru.id
     WHERE m.id = ?`,
    [id]
  );
  if (row) {
    row.reactions = [];
    if (row.metadata && typeof row.metadata === 'string') {
      try { row.metadata = JSON.parse(row.metadata); } catch (_) {}
    }
    row.deleted_for = [];
  }
  return row;
};

const editMessage = async (messageId, userId, newContent) => {
  const msg = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return null;
  if (msg.sender_id !== userId) throw new Error('Cannot edit someone else\'s message');

  const now = Date.now();
  await run(`INSERT INTO message_edit_history (message_id, content, edited_at) VALUES (?, ?, ?)`, [messageId, msg.content || '', now]);
  await run(
    `UPDATE messages SET content = ?, is_edited = 1, edited_at = ? WHERE id = ?`,
    [newContent, now, messageId]
  );
  return await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
};

const getEditHistory = async (messageId, userId) => {
  const msg = await get(`SELECT sender_id, receiver_id FROM messages WHERE id = ?`, [messageId]);
  if (!msg || (msg.sender_id !== userId && msg.receiver_id !== userId)) return [];
  return await all(`SELECT content, edited_at FROM message_edit_history WHERE message_id = ? ORDER BY edited_at ASC`, [messageId]);
};

const consumeOneTimeMedia = async (messageId, userId) => {
  const msg = await get(`SELECT one_time_viewed_by, sender_id, receiver_id FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return null;
  let viewers = [];
  try {
    viewers = JSON.parse(msg.one_time_viewed_by || '[]');
  } catch (_) {}
  if (!viewers.includes(userId)) {
    viewers.push(userId);
    await run(`UPDATE messages SET one_time_viewed_by = ? WHERE id = ?`, [JSON.stringify(viewers), messageId]);
  }
  return { viewers, sender_id: msg.sender_id, receiver_id: msg.receiver_id };
};

const checkBlockStatus = async (userA, userB) => {
  const aBlockedB = await get(`SELECT is_blocked FROM chat_settings WHERE user_id = ? AND contact_id = ?`, [userA, userB]);
  const bBlockedA = await get(`SELECT is_blocked FROM chat_settings WHERE user_id = ? AND contact_id = ?`, [userB, userA]);
  return {
    blockedBySender: aBlockedB ? aBlockedB.is_blocked === 1 : false,
    blockedByReceiver: bBlockedA ? bBlockedA.is_blocked === 1 : false,
    isBlocked: (aBlockedB && aBlockedB.is_blocked === 1) || (bBlockedA && bBlockedA.is_blocked === 1)
  };
};

const deleteMessageForMe = async (messageId, userId) => {
  const msg = await get(`SELECT id, deleted_for FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return false;
  let arr = [];
  try {
    arr = JSON.parse(msg.deleted_for || '[]');
  } catch (_) { arr = []; }
  if (!arr.includes(userId)) {
    arr.push(userId);
    await run(`UPDATE messages SET deleted_for = ? WHERE id = ?`, [JSON.stringify(arr), messageId]);
  }
  return true;
};

const deleteMessageForEveryone = async (messageId, userId) => {
  const msg = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return null;
  if (msg.sender_id !== userId) throw new Error('Cannot delete for everyone from another sender');

  await run(
    `UPDATE messages SET is_deleted_everyone = 1, content = 'This message was deleted', file_url = NULL WHERE id = ?`,
    [messageId]
  );
  await run(`DELETE FROM reactions WHERE message_id = ?`, [messageId]);
  return await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
};

const togglePinMessage = async (messageId) => {
  const msg = await get(`SELECT is_pinned FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return false;
  const newPinned = msg.is_pinned === 1 ? 0 : 1;
  await run(`UPDATE messages SET is_pinned = ? WHERE id = ?`, [newPinned, messageId]);
  return newPinned;
};

const getPinnedMessages = async (userA, userB) => {
  const pinned = await all(
    `SELECT * FROM messages
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       AND is_pinned = 1 AND is_deleted_everyone = 0
     ORDER BY created_at DESC`,
    [userA, userB, userB, userA]
  );
  for (const m of pinned) {
    if (m.metadata && typeof m.metadata === 'string') {
      try { m.metadata = JSON.parse(m.metadata); } catch (_) {}
    }
  }
  return pinned;
};

const votePoll = async (messageId, userId, optionId) => {
  const msg = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
  if (!msg || msg.type !== 'poll') return null;

  let pollData = {};
  try {
    pollData = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
  } catch (_) { return null; }

  const options = pollData.options || [];
  const allowMultiple = pollData.allow_multiple || false;

  for (const opt of options) {
    if (!opt.voters) opt.voters = [];
    if (opt.id === optionId) {
      if (opt.voters.includes(userId)) {
        opt.voters = opt.voters.filter(u => u !== userId);
      } else {
        opt.voters.push(userId);
      }
    } else if (!allowMultiple) {
      // Remove vote from other option if single choice
      opt.voters = opt.voters.filter(u => u !== userId);
    }
  }

  pollData.options = options;
  const updatedStr = JSON.stringify(pollData);
  await run(`UPDATE messages SET metadata = ? WHERE id = ?`, [updatedStr, messageId]);
  return pollData;
};

const getDueScheduledMessages = async () => {
  const now = Date.now();
  const list = await all(
    `SELECT * FROM messages WHERE scheduled_at IS NOT NULL AND scheduled_at <= ?`,
    [now]
  );
  if (list.length > 0) {
    await run(`UPDATE messages SET scheduled_at = NULL WHERE scheduled_at IS NOT NULL AND scheduled_at <= ?`, [now]);
  }
  return list;
};

const toggleStarMessage = async (messageId) => {
  const msg = await get(`SELECT is_starred FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return false;
  const newStarred = msg.is_starred === 1 ? 0 : 1;
  await run(`UPDATE messages SET is_starred = ? WHERE id = ?`, [newStarred, messageId]);
  return newStarred;
};

const getStarredMessages = async (userA, userB) => {
  return await all(
    `SELECT * FROM messages
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       AND is_starred = 1 AND is_deleted_everyone = 0
     ORDER BY created_at DESC`,
    [userA, userB, userB, userA]
  );
};

const getChatSettings = async (userId, contactId) => {
  const row = await get(
    `SELECT * FROM chat_settings WHERE user_id = ? AND contact_id = ?`,
    [userId, contactId]
  );
  if (!row) {
    return {
      user_id: userId,
      contact_id: contactId,
      wallpaper: '',
      accent_color: '#00a884',
      is_muted: 0,
      is_archived: 0,
      is_blocked: 0,
      is_locked: 0,
      lock_pin: ''
    };
  }
  return row;
};

const updateChatSettings = async (userId, contactId, settings) => {
  const current = await getChatSettings(userId, contactId);
  const updated = { ...current, ...settings };
  await run(
    `INSERT INTO chat_settings (user_id, contact_id, wallpaper, accent_color, is_muted, is_archived, is_blocked, is_locked, lock_pin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, contact_id) DO UPDATE SET
       wallpaper = excluded.wallpaper,
       accent_color = excluded.accent_color,
       is_muted = excluded.is_muted,
       is_archived = excluded.is_archived,
       is_blocked = excluded.is_blocked,
       is_locked = excluded.is_locked,
       lock_pin = excluded.lock_pin`,
    [
      userId,
      contactId,
      updated.wallpaper || '',
      updated.accent_color || '#00a884',
      updated.is_muted ? 1 : 0,
      updated.is_archived ? 1 : 0,
      updated.is_blocked ? 1 : 0,
      updated.is_locked ? 1 : 0,
      updated.lock_pin || ''
    ]
  );
  return updated;
};

const logCall = async ({ id, caller_id, receiver_id, type = 'voice', status = 'completed', duration = 0 }) => {
  const callId = id || uuidv4();
  const now = Date.now();
  await run(
    `INSERT INTO call_logs (id, caller_id, receiver_id, type, status, duration, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [callId, caller_id, receiver_id, type, status, duration, now]
  );
  return await get(`SELECT * FROM call_logs WHERE id = ?`, [callId]);
};

const getCallLogs = async (userId) => {
  return await all(
    `SELECT cl.*, 
            cu.display_name as caller_name, cu.avatar as caller_avatar,
            ru.display_name as receiver_name, ru.avatar as receiver_avatar
     FROM call_logs cl
     JOIN users cu ON cl.caller_id = cu.id
     JOIN users ru ON cl.receiver_id = ru.id
     WHERE cl.caller_id = ? OR cl.receiver_id = ?
     ORDER BY cl.created_at DESC LIMIT 50`,
    [userId, userId]
  );
};

const clearCallLogs = async (userId) => {
  await run(
    `DELETE FROM call_logs WHERE caller_id = ? OR receiver_id = ?`,
    [userId, userId]
  );
};

const setDisappearingTimer = async (userA, userB, seconds) => {
  const [minUser, maxUser] = [userA, userB].sort();
  await run(
    `INSERT INTO disappearing_settings (user_a, user_b, seconds, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_a, user_b) DO UPDATE SET seconds = excluded.seconds, updated_at = excluded.updated_at`,
    [minUser, maxUser, seconds, Date.now()]
  );
  return seconds;
};

const getDisappearingTimer = async (userA, userB) => {
  const [minUser, maxUser] = [userA, userB].sort();
  const row = await get(
    `SELECT seconds FROM disappearing_settings WHERE user_a = ? AND user_b = ?`,
    [minUser, maxUser]
  );
  return row ? row.seconds : 0;
};

const deleteExpiredMessages = async () => {
  const now = Date.now();
  const expired = await all(`SELECT id, sender_id, receiver_id FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ?`, [now]);
  if (expired.length > 0) {
    const ids = expired.map(m => m.id);
    const placeholders = ids.map(() => '?').join(',');
    await run(`DELETE FROM reactions WHERE message_id IN (${placeholders})`, ids);
    await run(`DELETE FROM messages WHERE id IN (${placeholders})`, ids);
  }
  return expired;
};

const markMessagesAsRead = async (senderId, receiverId) => {
  await run(
    `UPDATE messages SET status = 'read' WHERE sender_id = ? AND receiver_id = ? AND status != 'read'`,
    [senderId, receiverId]
  );
};

const toggleReaction = async (messageId, userId, emoji) => {
  const existing = await get(
    `SELECT * FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
    [messageId, userId, emoji]
  );

  if (existing) {
    await run(`DELETE FROM reactions WHERE id = ?`, [existing.id]);
    return { action: 'removed', emoji, userId, messageId };
  } else {
    await run(
      `INSERT INTO reactions (message_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?)`,
      [messageId, userId, emoji, Date.now()]
    );
    return { action: 'added', emoji, userId, messageId };
  }
};

const searchMessages = async (userA, userB, query) => {
  return await all(
    `SELECT * FROM messages
     WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       AND content LIKE ? AND is_deleted_everyone = 0
     ORDER BY created_at DESC LIMIT 50`,
    [userA, userB, userB, userA, `%${query}%`]
  );
};

const deleteMessage = async (messageId, userId) => {
  const msg = await get(`SELECT * FROM messages WHERE id = ?`, [messageId]);
  if (!msg) return false;
  if (msg.sender_id === userId) {
    await run(`DELETE FROM reactions WHERE message_id = ?`, [messageId]);
    await run(`DELETE FROM messages WHERE id = ?`, [messageId]);
    return true;
  }
  return false;
};

// ─────────────────────────────────────────
// Friend Request Functions
// ─────────────────────────────────────────

const sendFriendRequest = async (senderId, receiverId) => {
  const now = Date.now();
  const id = uuidv4();
  // Check for existing request in either direction
  const existing = await get(
    `SELECT * FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
    [senderId, receiverId, receiverId, senderId]
  );
  if (existing) return existing; // already exists
  await run(
    `INSERT INTO friend_requests (id, sender_id, receiver_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)`,
    [id, senderId, receiverId, now]
  );
  const req = await get(`SELECT * FROM friend_requests WHERE id = ?`, [id]);
  // Attach sender info
  const sender = await getUserById(senderId);
  return { ...req, sender };
};

const respondFriendRequest = async (requestId, status) => {
  const now = Date.now();
  await run(`UPDATE friend_requests SET status = ?, updated_at = ? WHERE id = ?`, [status, now, requestId]);
  return await get(`SELECT * FROM friend_requests WHERE id = ?`, [requestId]);
};

const getFriendRequests = async (userId) => {
  const rows = await all(
    `SELECT fr.*, 
            u.username as sender_username, u.display_name as sender_display_name, 
            u.avatar as sender_avatar, u.bio as sender_bio
     FROM friend_requests fr
     JOIN users u ON fr.sender_id = u.id
     WHERE fr.receiver_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [userId]
  );
  return rows;
};

const getSentFriendRequests = async (userId) => {
  const rows = await all(
    `SELECT fr.*,
            u.username as receiver_username, u.display_name as receiver_display_name,
            u.avatar as receiver_avatar
     FROM friend_requests fr
     JOIN users u ON fr.receiver_id = u.id
     WHERE fr.sender_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`,
    [userId]
  );
  return rows;
};

const getFriendshipStatus = async (userA, userB) => {
  return await get(
    `SELECT * FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
    [userA, userB, userB, userA]
  );
};

const searchUsers = async (query, currentUserId) => {
  if (!query || query.trim().length < 1) return [];
  const q = `%${query.trim()}%`;
  const users = await all(
    `SELECT id, username, display_name, avatar, bio, status, last_seen, hide_online_status
     FROM users WHERE id != ? AND (username LIKE ? OR display_name LIKE ?)
     LIMIT 20`,
    [currentUserId, q, q]
  );
  // Attach friendship status for each result
  const results = [];
  for (const user of users) {
    const friendStatus = await getFriendshipStatus(currentUserId, user.id);
    results.push({
      ...user,
      friendStatus: friendStatus ? friendStatus.status : null,
      friendRequestId: friendStatus ? friendStatus.id : null,
      iAmSender: friendStatus ? friendStatus.sender_id === currentUserId : false
    });
  }
  return results;
};

module.exports = {
  db,
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
  searchUsers
  ,createGroup
  ,getGroupMessages
  ,isGroupMember
  ,getGroupMembers
};
