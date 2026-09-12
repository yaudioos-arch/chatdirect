import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import LoginModal from './components/LoginModal';
import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import ContactInfoDrawer from './components/ContactInfoDrawer';
import UserProfileModal from './components/UserProfileModal';
import MediaLightbox from './components/MediaLightbox';
import CallModal from './components/CallModal';
import EditHistoryModal from './components/EditHistoryModal';
import ChatLockModal from './components/ChatLockModal';
import WallpaperModal from './components/WallpaperModal';
import UserSearchModal from './components/UserSearchModal';
import FriendRequestsModal from './components/FriendRequestsModal';
import StoryModal from './components/StoryModal';
import StoryViewerModal from './components/StoryViewerModal';
import { MessageSquare, Lock, Zap } from 'lucide-react';

export default function App() {
  const { currentUser } = useAuth();
  const {
    activeChat,
    selectChat,
    contacts,
    editHistoryModalMsg,
    setEditHistoryModalMsg,
    chatLockModalContact,
    setChatLockModalContact,
    wallpaperModalContact,
    setWallpaperModalContact,
    showUserSearch,
    setShowUserSearch,
    showFriendRequests,
    setShowFriendRequests
  } = useSocket();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [activeStory, setActiveStory] = useState(null);

  if (!currentUser) {
    return <LoginModal />;
  }

  return (
    <div className="h-screen w-screen flex bg-[#0c1317] text-[#e9edef] overflow-hidden">
      {/* WebRTC Call Modal (overlays everything) */}
      <CallModal />

      {/* Sidebar */}
      <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-shrink-0 h-full`}>
        <Sidebar onOpenProfile={() => setShowProfileModal(true)} onOpenStory={() => setShowStoryModal(true)} onOpenStoryViewer={setActiveStory} />
      </div>

      {/* Main Chat Window */}
      <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex flex-col h-full bg-[#0b141a] relative min-w-0 border-r border-[#222d34]/50`}>
        {activeChat ? (
          <>
            <ChatHeader
              onToggleInfo={() => setShowInfoDrawer(!showInfoDrawer)}
              onToggleSearch={() => setShowInfoDrawer(true)}
              onBackMobile={() => selectChat(null)}
              isInfoOpen={showInfoDrawer}
            />
            <MessageList />
            <MessageInput />
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none chat-bg-pattern">
            <div className="w-20 h-20 rounded-3xl bg-[#182229] border border-[#222d34] flex items-center justify-center mb-6 text-[#00a884] shadow-xl shadow-black/40">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-[#e9edef] tracking-tight">ChatDirect Messenger</h1>
            <p className="text-xs text-[#8696a0] max-w-sm mt-2 leading-relaxed">
              Real-time, direct 1-on-1 private messaging with video & voice calls, disappearing messages, GIFs, starred messages, and more.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md w-full">
              <div className="flex-1 bg-[#111b21] border border-[#222d34] p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#00a884]/15 flex items-center justify-center text-[#00a884] flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-semibold text-[#e9edef]">1-on-1 Private</h4>
                  <p className="text-[11px] text-[#8696a0]">No channels or group noise</p>
                </div>
              </div>
              <div className="flex-1 bg-[#111b21] border border-[#222d34] p-3.5 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#00a884]/15 flex items-center justify-center text-[#00a884] flex-shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-semibold text-[#e9edef]">Video & Voice Calls</h4>
                  <p className="text-[11px] text-[#8696a0]">WebRTC direct peer calls</p>
                </div>
              </div>
            </div>

            {contacts.length > 0 && (
              <div className="mt-8">
                <span className="text-xs font-semibold text-[#8696a0] block mb-3 uppercase tracking-wider">Quick Start Conversation</span>
                <div className="flex items-center gap-2 justify-center flex-wrap max-w-md">
                  {contacts.slice(0, 5).map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => selectChat(contact)}
                      className="flex items-center gap-2 bg-[#182229] hover:bg-[#202c33] border border-[#222d34] px-3 py-1.5 rounded-full transition text-xs text-[#e9edef]"
                    >
                      <img
                        src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`}
                        alt=""
                        className="w-5 h-5 rounded-full bg-[#111b21]"
                      />
                      <span className="font-medium truncate max-w-[100px]">{contact.display_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contact Info / Starred / Media Drawer */}
      {activeChat && showInfoDrawer && (
        <ContactInfoDrawer onClose={() => setShowInfoDrawer(false)} />
      )}

      {/* Profile Modal */}
      {showProfileModal && <UserProfileModal onClose={() => setShowProfileModal(false)} />}

      {/* Edit History Modal */}
      {editHistoryModalMsg && (
        <EditHistoryModal
          message={editHistoryModalMsg}
          onClose={() => setEditHistoryModalMsg(null)}
        />
      )}

      {/* Screen Lock Settings Modal */}
      {chatLockModalContact && (
        <ChatLockModal
          contact={chatLockModalContact}
          onClose={() => setChatLockModalContact(null)}
        />
      )}

      {/* Chat Wallpaper Modal */}
      {wallpaperModalContact && (
        <WallpaperModal
          contact={wallpaperModalContact}
          onClose={() => setWallpaperModalContact(null)}
        />
      )}

      {/* Media Lightbox */}
      <MediaLightbox />

      {/* User Search / Add Friends Modal */}
      {showUserSearch && <UserSearchModal onClose={() => setShowUserSearch(false)} />}

      {/* Friend Requests Modal */}
      {showFriendRequests && <FriendRequestsModal onClose={() => setShowFriendRequests(false)} />}
      {showStoryModal && <StoryModal onClose={() => setShowStoryModal(false)} />}
      {activeStory && <StoryViewerModal story={activeStory} onClose={() => setActiveStory(null)} />}
    </div>
  );
}
