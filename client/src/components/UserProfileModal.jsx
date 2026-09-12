import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiUrl } from '../lib/api';
import { X, Sparkles, User, Volume2, VolumeX, LogOut, Check, Upload, Loader2, EyeOff, Trash2 } from 'lucide-react';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Maya',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Leo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Max',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aria'
];

export default function UserProfileModal({ onClose }) {
  const { currentUser, updateProfile, logout, deleteAccount } = useAuth();
  const { soundEnabled, setSoundEnabled } = useSocket();

  const [hideOnlineStatus, setHideOnlineStatus] = useState(currentUser?.hide_online_status === 1);
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || AVATAR_PRESETS[0]);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (PNG, JPG, WEBP)');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.fileUrl) {
        setAvatar(data.fileUrl);
      } else {
        setErrorMsg('Failed to upload picture from gallery');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setErrorMsg('Error uploading image');
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateProfile({
      displayName: displayName.trim() || currentUser?.username,
      bio: bio.trim(),
      avatar,
      hideOnlineStatus: hideOnlineStatus ? 1 : 0
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const randomizeAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 9);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setErrorMsg('');
    const result = await deleteAccount(deletePassword);
    if (result.success) {
      onClose();
      return;
    }
    setErrorMsg(result.error || 'Failed to delete account');
    setIsDeleting(false);
  };

  return (
    <div className="profile-settings-overlay fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="profile-settings-modal w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="profile-settings-header flex items-center justify-between pb-3 mb-4 border-b border-[#222d34]">
          <div>
            <h2 className="text-base font-bold text-[#e9edef]">Profile & Settings</h2>
            <p>Manage your ChatDirect visual presence</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile settings"
            className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar customizer with Gallery Upload */}
          <div className="profile-avatar-section text-center">
            <div className="profile-avatar-frame relative inline-block mb-3">
              <img
                src={avatar}
                alt="Avatar"
                className="w-20 h-20 rounded-full mx-auto bg-[#202c33] border-2 border-[#00a884] p-0.5 object-cover"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[#00a884] animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={randomizeAvatar}
                className="absolute bottom-0 right-0 bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] p-1.5 rounded-full border border-[#222d34] transition shadow"
                title="Randomize avatar"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Gallery Upload Button */}
            <p className="profile-preset-label">Or choose a preset</p>
            <div className="flex justify-center mb-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="profile-upload-button flex items-center gap-1.5 text-xs bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] px-3 py-1.5 rounded-xl transition border border-[#222d34]"
              >
                <Upload className="w-3.5 h-3.5 text-[#00a884]" />
                <span>Upload from Gallery</span>
              </button>
            </div>

            <div className="flex justify-center gap-1.5 flex-wrap max-w-xs mx-auto">
              {AVATAR_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(p)}
                  className={`w-8 h-8 rounded-full border-2 overflow-hidden bg-[#202c33] transition ${
                    avatar === p ? 'border-[#00a884] scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={p} alt="Preset" className="w-full h-full p-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Username (read-only) */}
          <div className="profile-field">
            <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              disabled
              value={`@${currentUser?.username}`}
              className="w-full bg-[#202c33]/50 text-[#8696a0] px-3.5 py-2 rounded-xl text-xs border border-[#222d34] cursor-not-allowed"
            />
          </div>

          {/* Display Name */}
          <div className="profile-field">
            <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full bg-[#202c33] text-[#e9edef] px-3.5 py-2 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
            />
          </div>

          {/* Bio */}
          <div className="profile-field">
            <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              About / Status Bio
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              className="w-full bg-[#202c33] text-[#e9edef] px-3.5 py-2 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
            />
            <span className="profile-bio-count">{bio.length} / 500</span>
          </div>

          {/* Sound Notification Preference */}
          <div className="profile-toggle-row flex items-center justify-between p-3 bg-[#182229] rounded-xl border border-[#222d34]">
            <div className="flex items-center gap-2 text-xs text-[#e9edef]">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00a884]" /> : <VolumeX className="w-4 h-4 text-[#8696a0]" />}
              <span>Notification Chimes</span>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label="Toggle notification chimes"
              className={`profile-toggle w-10 h-6 rounded-full transition-colors relative ${
                soundEnabled ? 'bg-[#00a884]' : 'bg-[#2a3942]'
              }`}
            >
              <span
                className={`profile-toggle-knob absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Hide Online Status (Ghost Mode) */}
          <div className="profile-toggle-row flex items-center justify-between p-3 bg-[#182229] rounded-xl border border-[#222d34]">
            <div className="flex items-start gap-2 text-xs text-[#e9edef]">
              <EyeOff className={`w-4 h-4 mt-0.5 ${hideOnlineStatus ? 'text-[#00a884]' : 'text-[#8696a0]'}`} />
              <div>
                <span className="font-medium">Hide Online Status</span>
                <p className="text-[11px] text-[#8696a0] mt-0.5">
                  Appear offline and hide your last seen status from all contacts
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHideOnlineStatus(!hideOnlineStatus)}
              aria-label="Toggle online status privacy"
              className={`profile-toggle w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ml-3 ${
                hideOnlineStatus ? 'bg-[#00a884]' : 'bg-[#2a3942]'
              }`}
            >
              <span
                className={`profile-toggle-knob absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  hideOnlineStatus ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
              <p className="text-xs text-rose-200">
                This permanently deletes your account, messages, contacts, and settings. This cannot be undone.
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password to confirm"
                className="w-full bg-[#202c33] text-[#e9edef] px-3 py-2 rounded-lg text-xs border border-rose-500/30 focus:border-rose-400 focus:outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                  }}
                  className="text-xs text-[#8696a0] hover:text-[#e9edef] px-3 py-2"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !deletePassword}
                  className="flex items-center gap-1.5 text-xs text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 px-3 py-2 rounded-lg"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Permanently delete
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="profile-settings-actions flex items-center justify-between pt-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 py-2 px-3 rounded-lg hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
              {!showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setErrorMsg('');
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-400/80 hover:text-rose-300 py-2 px-3 rounded-lg hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete account</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="profile-save-button font-semibold text-xs py-2.5 px-5 rounded-xl flex items-center gap-1.5 transition shadow"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
