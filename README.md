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

## ☁️ Free Hosting on Netlify (Frontend)

This app is a real-time chat app with a persistent Socket.IO backend and SQLite database. Netlify can host the frontend for free, but it cannot host the current backend stack reliably for free as-is.

The recommended free setup is:
- Frontend: Netlify
- Backend: Render or Railway
- Database: SQLite on the backend service (or migrate to Postgres later)

### Frontend setup in Netlify
1. Import the repository as a Netlify site.
2. Set the base directory to `client`.
3. Netlify will use `client/netlify.toml` for the build and SPA redirect.
4. Use the following environment variables in Netlify:
   - `VITE_API_URL=https://your-backend-url.com`
   - `VITE_SOCKET_URL=https://your-backend-url.com`

### Backend setup
Deploy the `server` folder to Render/Railway and set `PORT` from the platform env. Then point the frontend env vars to that backend URL.

Important: the current Socket.IO server expects a long-lived Node process and local filesystem for uploads. Netlify alone is not the right host for the backend in a free tier. The frontend is ready for that split, and you can use the two env vars above to connect the app to a hosted backend.
