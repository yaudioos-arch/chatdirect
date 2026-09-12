# ChatDirect - Real-Time 1-on-1 Web Chat Application

A fast, responsive, modern 1-on-1 private messaging web chat application (pure direct messaging with **no channels or groups**), inspired by WhatsApp Web & Telegram.

---

## ✨ Features

- **Pure 1-on-1 Direct Messaging**: No channels, no groups, no distractions.
- **Real-Time Delivery**: Low-latency instant messaging powered by Socket.IO.
- **Typing Indicators**: Real-time "*Alex is typing...*" feedback.
- **Live User Presence**: Online, Away, Do Not Disturb, and Offline status badges with last-seen timestamps.
- **Message Status & Read Receipts**: Sent (`✓`), Delivered (`✓✓`), and Read (`✓✓` in blue).
- **Rich Media & File Sharing**:
  - Image and photo sharing with fullscreen Lightbox viewer.
  - Document & file sharing with download button and size preview.
  - Voice Note audio recording & playback with waveform and duration slider.
- **Emoji Reactions & Quoted Replies**:
  - React to any message with emojis (`👍`, `❤️`, `😂`, `🔥`, `🎉`, etc.).
  - Reply / quote previous messages in conversation.
- **Contact Management & Search**:
  - Real-time contact list with last message snippet and unread message counter badge.
  - Search across contacts or within conversation messages.
  - Right-side contact info drawer with shared media gallery.
- **User Customization**:
  - Custom display name, bio status, and avatar generator.
  - Web Audio synthesized notification chimes (sound toggle on/off).
- **Persistent Storage**:
  - SQLite database persists all user profiles, direct messages, attachments, and reactions.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, date-fns.
- **Backend**: Node.js, Express, Socket.IO, Multer.
- **Database**: SQLite3 with indexing for optimal performance.

---

## 🚀 Quick Start

### 1. Start Both Server & Client Together
In the root directory, simply run:
```bash
node start-dev.js
```
or:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API & WebSockets**: `http://localhost:5000`

---

### 2. Testing 1-on-1 Messaging
1. Open `http://localhost:5173` in one browser tab (e.g. sign in as **Alice**).
2. Open `http://localhost:5173` in a second browser window / incognito tab (e.g. sign in as **Bob**).
3. Select each other from the contacts list to start a real-time private 1-on-1 conversation!

---

### Single-service Render setup

The repository can also run frontend and backend together from one Render Web Service:

1. Create a Render Web Service connected to this repository.
2. Leave **Root Directory** empty. Do not enter `project root`; that is not a folder in this repository.
3. Set **Build Command** to `npm run build`.
4. Set **Start Command** to `npm start`.
5. Set `CORS_ORIGIN` to `*` or to the final public URL.

The Node server serves `client/dist` and handles the API and Socket.IO from the same URL. Do not set `VITE_API_URL` or `VITE_SOCKET_URL` for this single-service deployment; the frontend uses its own origin automatically.
